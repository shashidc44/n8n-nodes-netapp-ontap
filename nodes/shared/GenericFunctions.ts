import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, sleep } from 'n8n-workflow';

import type { OntapApiResponse, OntapJob, OntapCredentials } from './types';

/**
 * Default timeout for job polling (5 minutes)
 */
const DEFAULT_JOB_TIMEOUT_MS = 300000;

/**
 * Default polling interval (2 seconds)
 */
const DEFAULT_POLL_INTERVAL_MS = 2000;

/**
 * Build the base URL for ONTAP API requests
 */
export function getOntapBaseUrl(host: string, port: number = 443): string {
	return `https://${host}:${port}`;
}

/**
 * Make an authenticated request to the ONTAP REST API
 */
export async function ontapApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
): Promise<OntapApiResponse> {
	const credentials = await this.getCredentials('netAppOntapApi') as OntapCredentials;

	// Get cluster host and port from node parameters
	const clusterHost = this.getNodeParameter('clusterHost', 0) as string;
	const clusterPort = this.getNodeParameter('clusterPort', 0, 443) as number;
	const baseUrl = getOntapBaseUrl(clusterHost, clusterPort);

	const options: IHttpRequestOptions = {
		method,
		body,
		qs: query,
		url: uri || `${baseUrl}/api${endpoint}`,
		skipSslCertificateValidation: credentials.allowUnauthorizedCerts,
		returnFullResponse: false,
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/hal+json',
		},
	};

	// Remove empty body for GET/DELETE requests
	if (method === 'GET' || method === 'DELETE') {
		delete options.body;
	}

	// Remove empty query string
	if (Object.keys(query).length === 0) {
		delete options.qs;
	}

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'netAppOntapApi',
			options,
		);
		return response as OntapApiResponse;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: parseOntapError(error),
		});
	}
}

/**
 * Make a paginated request to fetch all items from an ONTAP endpoint
 */
export async function ontapApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	propertyName = 'records',
): Promise<IDataObject[]> {
	// Get cluster host and port from node parameters
	const clusterHost = this.getNodeParameter('clusterHost', 0) as string;
	const clusterPort = this.getNodeParameter('clusterPort', 0, 443) as number;
	const baseUrl = getOntapBaseUrl(clusterHost, clusterPort);

	const returnData: IDataObject[] = [];
	let responseData: OntapApiResponse;
	let nextLink: string | undefined;

	// Set max_records for pagination if not already specified
	query.max_records = query.max_records || 1000;

	do {
		if (nextLink) {
			// Use the full next link URL for subsequent requests
			responseData = await ontapApiRequest.call(this, method, '', body, {}, `${baseUrl}${nextLink}`);
		} else {
			responseData = await ontapApiRequest.call(this, method, endpoint, body, query);
		}

		// Extract records from the specified property
		const records = (responseData as IDataObject)[propertyName] as IDataObject[] || [];
		returnData.push(...records);

		// Check for next page link
		nextLink = responseData._links?.next?.href as string | undefined;
	} while (nextLink);

	return returnData;
}

/**
 * Poll an ONTAP job until completion
 */
export async function pollJobUntilComplete(
	this: IExecuteFunctions,
	jobUuid: string,
	timeoutMs: number = DEFAULT_JOB_TIMEOUT_MS,
	pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): Promise<OntapJob> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeoutMs) {
		const jobResponse = await ontapApiRequest.call(
			this,
			'GET',
			`/cluster/jobs/${jobUuid}`,
		) as unknown as OntapJob;

		const state = jobResponse.state;

		// Job completed successfully
		if (state === 'success') {
			return jobResponse;
		}

		// Job failed
		if (state === 'failure') {
			const errorMessage = jobResponse.message || 'Job failed without error message';
			throw new NodeApiError(this.getNode(), { message: errorMessage } as JsonObject, {
				message: `ONTAP job failed: ${errorMessage}`,
			});
		}

		// Job still running, wait before polling again
		if (state === 'running' || state === 'queued' || state === 'paused') {
			await sleep(pollIntervalMs);
			continue;
		}

		// Unknown state
		throw new NodeApiError(this.getNode(), { state } as JsonObject, {
			message: `Unknown job state: ${state}`,
		});
	}

	throw new NodeApiError(this.getNode(), {} as JsonObject, {
		message: `Job ${jobUuid} did not complete within ${timeoutMs / 1000} seconds`,
	});
}

/**
 * Handle async job responses - if response contains a job, poll until complete
 */
export async function handleAsyncResponse(
	this: IExecuteFunctions,
	response: OntapApiResponse,
	waitForCompletion = true,
): Promise<IDataObject> {
	// Check if response contains a job reference
	const job = response.job as IDataObject | undefined;
	
	if (job && job.uuid) {
		if (waitForCompletion) {
			// Poll the job until completion
			const completedJob = await pollJobUntilComplete.call(this, job.uuid as string);
			
			// Return the completed job information along with the original response
			return {
				...response,
				job: completedJob,
				_jobCompleted: true,
			};
		}
		
		// Return immediately with job info
		return {
			...response,
			_jobCompleted: false,
		};
	}

	// No job in response, return as-is
	return response;
}

/**
 * Parse ONTAP error responses into user-friendly messages
 */
export function parseOntapError(error: unknown): string {
	const err = error as IDataObject;
	
	// Try to extract ONTAP-specific error structure
	if (err.error) {
		const ontapError = err.error as IDataObject;
		
		// Handle error object with message and code
		if (ontapError.message) {
			const code = ontapError.code ? ` (Error code: ${ontapError.code})` : '';
			return `${ontapError.message}${code}`;
		}
		
		// Handle array of errors
		if (Array.isArray(ontapError)) {
			const messages = ontapError.map((e: IDataObject) => e.message || 'Unknown error');
			return messages.join('; ');
		}
	}

	// Common error code mappings
	const errorCodeMap: Record<string, string> = {
		'4': 'Invalid input parameters',
		'65536': 'Resource not found',
		'917927': 'Volume not found or does not exist',
		'1376259': 'Aggregate not found',
		'2621462': 'SVM not found or not configured',
		'6619139': 'LUN not found',
		'13303850': 'Snapshot policy not found',
		'262179': 'Permission denied - check credentials',
		'1254269': 'Network interface not found',
		'2621706': 'Export policy not found',
	};

	// Check for HTTP status codes
	if (err.statusCode) {
		const statusCode = err.statusCode as number;
		switch (statusCode) {
			case 400:
				return 'Bad request - Invalid parameters provided';
			case 401:
				return 'Authentication failed - Invalid username or password';
			case 403:
				return 'Access denied - Insufficient permissions';
			case 404:
				return 'Resource not found';
			case 409:
				return 'Conflict - Resource already exists or operation conflicts with current state';
			case 500:
				return 'ONTAP internal server error';
			case 503:
				return 'ONTAP service temporarily unavailable';
		}
	}

	// Try to get code from error
	const code = err.code as string | undefined;
	if (code && errorCodeMap[code]) {
		return errorCodeMap[code];
	}

	// Fallback to raw error message
	if (err.message) {
		return err.message as string;
	}

	return 'An unknown error occurred while communicating with ONTAP';
}

/**
 * Build common field query parameters for ONTAP requests
 * @param fields - Array of field names to include in response
 */
export function buildFieldsQuery(fields?: string[]): IDataObject {
	if (!fields || fields.length === 0) {
		return {};
	}
	return { fields: fields.join(',') };
}

/**
 * Clean empty values from an object (for request bodies)
 */
export function cleanObject(obj: IDataObject): IDataObject {
	const cleaned: IDataObject = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined && value !== null && value !== '') {
			if (typeof value === 'object' && !Array.isArray(value)) {
				const cleanedNested = cleanObject(value as IDataObject);
				if (Object.keys(cleanedNested).length > 0) {
					cleaned[key] = cleanedNested;
				}
			} else {
				cleaned[key] = value;
			}
		}
	}
	return cleaned;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Convert human-readable size to bytes
 * Supports: B, KB, MB, GB, TB, PB (case-insensitive)
 */
export function parseSize(sizeStr: string): number {
	const match = sizeStr.trim().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB|PB)?$/i);
	if (!match) {
		throw new Error(`Invalid size format: ${sizeStr}. Use format like "100GB" or "1TB"`);
	}
	
	const value = parseFloat(match[1]);
	const unit = (match[2] || 'B').toUpperCase();
	
	const multipliers: Record<string, number> = {
		'B': 1,
		'KB': 1024,
		'MB': 1024 ** 2,
		'GB': 1024 ** 3,
		'TB': 1024 ** 4,
		'PB': 1024 ** 5,
	};
	
	return Math.floor(value * multipliers[unit]);
}

/**
 * Parse API filter string into query parameters
 * Format: "field1=value1,field2=value2,field3=!excludeValue"
 * Supports ONTAP query operators: =, !=, <, >, <=, >=, *, |
 * Example: "type=rw,state=!offline,size=>1073741824"
 */
export function parseApiFilters(filterString: string): IDataObject {
	const qs: IDataObject = {};
	
	if (!filterString || filterString.trim() === '') {
		return qs;
	}
	
	// Split by comma, but handle values that might contain commas in quotes
	const filters = filterString.split(',').map(f => f.trim()).filter(f => f);
	
	for (const filter of filters) {
		// Find the first = sign (the operator)
		const eqIndex = filter.indexOf('=');
		if (eqIndex === -1) {
			continue; // Skip invalid filters
		}
		
		const field = filter.substring(0, eqIndex).trim();
		const value = filter.substring(eqIndex + 1).trim();
		
		if (field && value !== undefined) {
			qs[field] = value;
		}
	}
	
	return qs;
}
