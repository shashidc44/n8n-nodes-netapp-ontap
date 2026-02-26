import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	ontapApiRequest,
	ontapApiRequestAllItems,
	handleAsyncResponse,
	cleanObject,
	parseApiFilters,
} from '../shared/GenericFunctions';

export class NetAppOntapCluster implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NetApp ONTAP Cluster',
		name: 'netAppOntapCluster',
		icon: 'file:netapp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage NetApp ONTAP cluster, nodes, licenses, and jobs',
		defaults: {
			name: 'ONTAP Cluster',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'netAppOntapApi',
				required: true,
			},
		],
		properties: [
			// Cluster Connection
			{
				displayName: 'Cluster Host',
				name: 'clusterHost',
				type: 'string',
				default: '',
				placeholder: 'cluster.example.com',
				description: 'The hostname or IP address of the ONTAP cluster management LIF',
				required: true,
			},
			{
				displayName: 'Port',
				name: 'clusterPort',
				type: 'number',
				default: 443,
				description: 'HTTPS port for the ONTAP REST API',
			},
			// Resource Selection
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Cluster',
						value: 'cluster',
						description: 'Manage cluster-level settings',
					},
					{
						name: 'Job',
						value: 'job',
						description: 'Monitor and manage cluster jobs',
					},
					{
						name: 'License',
						value: 'license',
						description: 'Manage feature licenses',
					},
					{
						name: 'Node',
						value: 'node',
						description: 'Manage cluster nodes',
					},
					{
						name: 'Schedule',
						value: 'schedule',
						description: 'Manage job schedules',
					},
				],
				default: 'cluster',
			},

			// ===================
			// CLUSTER OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['cluster'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get cluster information',
						action: 'Get cluster information',
					},
					{
						name: 'Get Metrics',
						value: 'getMetrics',
						description: 'Get cluster performance metrics',
						action: 'Get cluster metrics',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update cluster settings',
						action: 'Update cluster settings',
					},
				],
				default: 'get',
			},

			// Cluster Update Fields
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['cluster'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Cluster Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the cluster',
					},
					{
						displayName: 'Contact',
						name: 'contact',
						type: 'string',
						default: '',
						description: 'Contact information for the cluster administrator',
					},
					{
						displayName: 'Location',
						name: 'location',
						type: 'string',
						default: '',
						description: 'Physical location of the cluster',
					},
					{
						displayName: 'DNS Domains',
						name: 'dns_domains',
						type: 'string',
						default: '',
						description: 'Comma-separated list of DNS domains',
					},
					{
						displayName: 'Name Servers',
						name: 'name_servers',
						type: 'string',
						default: '',
						description: 'Comma-separated list of DNS server IP addresses',
					},
					{
						displayName: 'NTP Servers',
						name: 'ntp_servers',
						type: 'string',
						default: '',
						description: 'Comma-separated list of NTP server addresses',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: '',
						placeholder: 'America/New_York',
						description: 'Timezone for the cluster',
					},
				],
			},

			// Metrics Options
			{
				displayName: 'Options',
				name: 'metricsOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['cluster'],
						operation: ['getMetrics'],
					},
				},
				options: [
					{
						displayName: 'Interval',
						name: 'interval',
						type: 'options',
						options: [
							{ name: '15 Seconds', value: 'PT15S' },
							{ name: '1 Hour', value: 'PT1H' },
							{ name: '1 Day', value: 'P1D' },
						],
						default: 'PT1H',
						description: 'Time interval for metrics',
					},
				],
			},

			// ===================
			// NODE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['node'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a specific node',
						action: 'Get node',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all nodes in the cluster',
						action: 'Get many nodes',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update node settings',
						action: 'Update node',
					},
				],
				default: 'getMany',
			},

			// Node UUID/Name
			{
				displayName: 'Node',
				name: 'nodeId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['node'],
						operation: ['get', 'update'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
						placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'node-01',
					},
				],
			},

			// Node Update Fields
			{
				displayName: 'Update Fields',
				name: 'nodeUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['node'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Location',
						name: 'location',
						type: 'string',
						default: '',
						description: 'Physical location of the node',
					},
				],
			},

			// ===================
			// LICENSE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['license'],
					},
				},
				options: [
					{
						name: 'Add',
						value: 'add',
						description: 'Add a new license key',
						action: 'Add license',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Remove a license',
						action: 'Delete license',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get license information for a feature',
						action: 'Get license',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all licenses',
						action: 'Get many licenses',
					},
				],
				default: 'getMany',
			},

			// License Key for Add
			{
				displayName: 'License Keys',
				name: 'licenseKeys',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['license'],
						operation: ['add'],
					},
				},
				description: 'One or more license keys (one per line)',
			},

			// License Feature Name
			{
				displayName: 'License Feature',
				name: 'licenseName',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['license'],
						operation: ['get', 'delete'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'nfs',
					},
				],
			},

			// License Serial Number for Delete
			{
				displayName: 'Serial Number',
				name: 'licenseSerial',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['license'],
						operation: ['delete'],
					},
				},
				description: 'Serial number of the license to delete (optional - deletes all if not specified)',
			},

			// ===================
			// JOB OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['job'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a specific job',
						action: 'Get job',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all jobs',
						action: 'Get many jobs',
					},
					{
						name: 'Wait',
						value: 'wait',
						description: 'Wait for a job to complete',
						action: 'Wait for job',
					},
				],
				default: 'getMany',
			},

			// Job UUID
			{
				displayName: 'Job UUID',
				name: 'jobUuid',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['get', 'wait'],
					},
				},
				description: 'UUID of the job',
			},

			// Job Wait Timeout
			{
				displayName: 'Timeout (Seconds)',
				name: 'waitTimeout',
				type: 'number',
				default: 300,
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['wait'],
					},
				},
				description: 'Maximum time to wait for job completion',
			},

			// Job Filters
			{
				displayName: 'Filters',
				name: 'jobFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						displayName: 'API Filters',
						name: 'apiFilters',
						type: 'string',
						default: '',
						placeholder: 'type=rw,state=!offline',
						description: 'ONTAP API filter expression. Format: field=value,field2=value2. Supports operators: =, !=, <, >, <=, >=, *, |',
					},
					{
						displayName: 'Return All',
						name: 'returnAll',
						type: 'boolean',
						default: true,
						description: 'Whether to return all results',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 50,
						description: 'Max number of results',
						typeOptions: {
							minValue: 1,
						},
						displayOptions: {
							show: {
								returnAll: [false],
							},
						},
					},
				],
			},

			// ===================
			// SCHEDULE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['schedule'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new schedule',
						action: 'Create schedule',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a schedule',
						action: 'Delete schedule',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a specific schedule',
						action: 'Get schedule',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all schedules',
						action: 'Get many schedules',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a schedule',
						action: 'Update schedule',
					},
				],
				default: 'getMany',
			},

			// Schedule UUID
			{
				displayName: 'Schedule',
				name: 'scheduleId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['schedule'],
						operation: ['get', 'delete', 'update'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
						placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
					},
				],
			},

			// Schedule Create Fields
			{
				displayName: 'Schedule Name',
				name: 'scheduleName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['schedule'],
						operation: ['create'],
					},
				},
				description: 'Name of the schedule',
			},
			{
				displayName: 'Schedule Type',
				name: 'scheduleType',
				type: 'options',
				options: [
					{ name: 'Cron', value: 'cron' },
					{ name: 'Interval', value: 'interval' },
				],
				default: 'cron',
				required: true,
				displayOptions: {
					show: {
						resource: ['schedule'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Cron Schedule',
				name: 'cronSchedule',
				type: 'collection',
				placeholder: 'Configure Schedule',
				default: {},
				displayOptions: {
					show: {
						resource: ['schedule'],
						operation: ['create'],
						scheduleType: ['cron'],
					},
				},
				options: [
					{
						displayName: 'Minutes',
						name: 'minutes',
						type: 'string',
						default: '0',
						description: 'Minutes (0-59 or comma-separated values)',
					},
					{
						displayName: 'Hours',
						name: 'hours',
						type: 'string',
						default: '0',
						description: 'Hours (0-23 or comma-separated values)',
					},
					{
						displayName: 'Days of Month',
						name: 'days',
						type: 'string',
						default: '*',
						description: 'Days of month (1-31 or comma-separated values)',
					},
					{
						displayName: 'Months',
						name: 'months',
						type: 'string',
						default: '*',
						description: 'Months (1-12 or comma-separated values)',
					},
					{
						displayName: 'Days of Week',
						name: 'weekdays',
						type: 'string',
						default: '*',
						description: 'Days of week (0-6, 0=Sunday or comma-separated values)',
					},
				],
			},
			{
				displayName: 'Interval (Seconds)',
				name: 'intervalSeconds',
				type: 'number',
				default: 3600,
				displayOptions: {
					show: {
						resource: ['schedule'],
						operation: ['create'],
						scheduleType: ['interval'],
					},
				},
				description: 'Interval in seconds between executions',
			},

			// Additional Options for all operations
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'string',
						default: '',
						description: 'Comma-separated list of fields to include in the response (use * for all)',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] = {};
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				const qs: IDataObject = {};

				if (options.fields) {
					qs.fields = options.fields;
				}

				// ========== CLUSTER ==========
				if (resource === 'cluster') {
					if (operation === 'get') {
						responseData = await ontapApiRequest.call(this, 'GET', '/cluster', {}, qs);
					} else if (operation === 'getMetrics') {
						const metricsOptions = this.getNodeParameter('metricsOptions', i, {}) as IDataObject;
						if (metricsOptions.interval) {
							qs.interval = metricsOptions.interval;
						}
						responseData = await ontapApiRequest.call(this, 'GET', '/cluster/metrics', {}, qs);
					} else if (operation === 'update') {
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const body: IDataObject = {};

						if (updateFields.name) body.name = updateFields.name;
						if (updateFields.contact) body.contact = updateFields.contact;
						if (updateFields.location) body.location = updateFields.location;
						if (updateFields.timezone) {
							body.timezone = { name: updateFields.timezone };
						}
						if (updateFields.dns_domains) {
							body.dns_domains = (updateFields.dns_domains as string).split(',').map(d => d.trim());
						}
						if (updateFields.name_servers) {
							body.name_servers = (updateFields.name_servers as string).split(',').map(s => s.trim());
						}
						if (updateFields.ntp_servers) {
							body.ntp_servers = (updateFields.ntp_servers as string).split(',').map(s => s.trim());
						}

						const response = await ontapApiRequest.call(this, 'PATCH', '/cluster', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== NODE ==========
				else if (resource === 'node') {
					if (operation === 'getMany') {
						responseData = await ontapApiRequestAllItems.call(this, 'GET', '/cluster/nodes', {}, qs);
					} else if (operation === 'get') {
						const nodeLocator = this.getNodeParameter('nodeId', i) as { mode: string; value: string };
						let nodeId = nodeLocator.value;
						
						// If by name, look up the UUID first
						if (nodeLocator.mode === 'name') {
							const nodes = await ontapApiRequestAllItems.call(this, 'GET', '/cluster/nodes', {}, { name: nodeId });
							if (nodes.length === 0) {
								throw new Error(`Node "${nodeId}" not found`);
							}
							nodeId = nodes[0].uuid as string;
						}
						
						responseData = await ontapApiRequest.call(this, 'GET', `/cluster/nodes/${nodeId}`, {}, qs);
					} else if (operation === 'update') {
						const nodeLocator = this.getNodeParameter('nodeId', i) as { mode: string; value: string };
						let nodeId = nodeLocator.value;
						
						if (nodeLocator.mode === 'name') {
							const nodes = await ontapApiRequestAllItems.call(this, 'GET', '/cluster/nodes', {}, { name: nodeId });
							if (nodes.length === 0) {
								throw new Error(`Node "${nodeId}" not found`);
							}
							nodeId = nodes[0].uuid as string;
						}
						
						const updateFields = this.getNodeParameter('nodeUpdateFields', i) as IDataObject;
						const body = cleanObject(updateFields);
						
						const response = await ontapApiRequest.call(this, 'PATCH', `/cluster/nodes/${nodeId}`, body);
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== LICENSE ==========
				else if (resource === 'license') {
					if (operation === 'getMany') {
						responseData = await ontapApiRequestAllItems.call(this, 'GET', '/cluster/licensing/licenses', {}, qs);
					} else if (operation === 'get') {
						const licenseLocator = this.getNodeParameter('licenseName', i) as { mode: string; value: string };
						const licenseName = licenseLocator.value;
						responseData = await ontapApiRequest.call(this, 'GET', `/cluster/licensing/licenses/${licenseName}`, {}, qs);
					} else if (operation === 'add') {
						const licenseKeys = this.getNodeParameter('licenseKeys', i) as string;
						const keys = licenseKeys.split('\n').map(k => k.trim()).filter(k => k);
						
						const body = { keys };
						const response = await ontapApiRequest.call(this, 'POST', '/cluster/licensing/licenses', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const licenseLocator = this.getNodeParameter('licenseName', i) as { mode: string; value: string };
						const licenseName = licenseLocator.value;
						const serialNumber = this.getNodeParameter('licenseSerial', i) as string;
						
						let endpoint = `/cluster/licensing/licenses/${licenseName}`;
						if (serialNumber) {
							endpoint += `?serial_number=${serialNumber}`;
						}
						
						await ontapApiRequest.call(this, 'DELETE', endpoint);
						responseData = { success: true, deleted: licenseName };
					}
				}

				// ========== JOB ==========
				else if (resource === 'job') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('jobFilters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll) {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/cluster/jobs', {}, qs);
						} else {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/cluster/jobs', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						}
					} else if (operation === 'get') {
						const jobUuid = this.getNodeParameter('jobUuid', i) as string;
						responseData = await ontapApiRequest.call(this, 'GET', `/cluster/jobs/${jobUuid}`, {}, qs);
					} else if (operation === 'wait') {
						const jobUuid = this.getNodeParameter('jobUuid', i) as string;
						const timeout = this.getNodeParameter('waitTimeout', i) as number;
						
						const { pollJobUntilComplete } = await import('../shared/GenericFunctions');
						responseData = await pollJobUntilComplete.call(this, jobUuid, timeout * 1000);
					}
				}

				// ========== SCHEDULE ==========
				else if (resource === 'schedule') {
					if (operation === 'getMany') {
						responseData = await ontapApiRequestAllItems.call(this, 'GET', '/cluster/schedules', {}, qs);
					} else if (operation === 'get') {
						const scheduleLocator = this.getNodeParameter('scheduleId', i) as { mode: string; value: string };
						responseData = await ontapApiRequest.call(this, 'GET', `/cluster/schedules/${scheduleLocator.value}`, {}, qs);
					} else if (operation === 'delete') {
						const scheduleLocator = this.getNodeParameter('scheduleId', i) as { mode: string; value: string };
						await ontapApiRequest.call(this, 'DELETE', `/cluster/schedules/${scheduleLocator.value}`);
						responseData = { success: true, deleted: scheduleLocator.value };
					} else if (operation === 'create') {
						const name = this.getNodeParameter('scheduleName', i) as string;
						const type = this.getNodeParameter('scheduleType', i) as string;
						
						const body: IDataObject = { name };
						
						if (type === 'cron') {
							const cronSchedule = this.getNodeParameter('cronSchedule', i, {}) as IDataObject;
							body.cron = {};
							if (cronSchedule.minutes) (body.cron as IDataObject).minutes = (cronSchedule.minutes as string).split(',').map(v => parseInt(v.trim(), 10));
							if (cronSchedule.hours) (body.cron as IDataObject).hours = (cronSchedule.hours as string).split(',').map(v => parseInt(v.trim(), 10));
							if (cronSchedule.days && cronSchedule.days !== '*') (body.cron as IDataObject).days = (cronSchedule.days as string).split(',').map(v => parseInt(v.trim(), 10));
							if (cronSchedule.months && cronSchedule.months !== '*') (body.cron as IDataObject).months = (cronSchedule.months as string).split(',').map(v => parseInt(v.trim(), 10));
							if (cronSchedule.weekdays && cronSchedule.weekdays !== '*') (body.cron as IDataObject).weekdays = (cronSchedule.weekdays as string).split(',').map(v => parseInt(v.trim(), 10));
						} else {
							const interval = this.getNodeParameter('intervalSeconds', i) as number;
							body.interval = `PT${interval}S`;
						}
						
						const response = await ontapApiRequest.call(this, 'POST', '/cluster/schedules', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const scheduleLocator = this.getNodeParameter('scheduleId', i) as { mode: string; value: string };
						// For update, use the same structure as create but don't require name
						const body: IDataObject = {};
						
						// Get update fields - similar to create fields
						const response = await ontapApiRequest.call(this, 'PATCH', `/cluster/schedules/${scheduleLocator.value}`, body);
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// Return results
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
