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

export class NetAppOntapSvm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NetApp ONTAP SVM',
		name: 'netAppOntapSvm',
		icon: 'file:netapp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage NetApp ONTAP Storage Virtual Machines (SVMs/Vservers)',
		defaults: {
			name: 'ONTAP SVM',
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
			// Resource Selection
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'SVM',
						value: 'svm',
						description: 'Manage Storage Virtual Machines',
					},
					{
						name: 'SVM Peer',
						value: 'svmPeer',
						description: 'Manage SVM peer relationships',
					},
				],
				default: 'svm',
			},

			// ===================
			// SVM OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['svm'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new SVM',
						action: 'Create SVM',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an SVM',
						action: 'Delete SVM',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get SVM details',
						action: 'Get SVM',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all SVMs',
						action: 'Get many SVMs',
					},
					{
						name: 'Start',
						value: 'start',
						description: 'Start an SVM',
						action: 'Start SVM',
					},
					{
						name: 'Stop',
						value: 'stop',
						description: 'Stop an SVM',
						action: 'Stop SVM',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update SVM settings',
						action: 'Update SVM',
					},
				],
				default: 'getMany',
			},

			// SVM Selection
			{
				displayName: 'SVM',
				name: 'svmId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['svm'],
						operation: ['get', 'update', 'delete', 'start', 'stop'],
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
						placeholder: 'svm1',
					},
				],
			},

			// SVM Create Fields
			{
				displayName: 'SVM Name',
				name: 'svmName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['svm'],
						operation: ['create'],
					},
				},
				description: 'Name for the new SVM',
			},
			{
				displayName: 'IPspace',
				name: 'ipspace',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				displayOptions: {
					show: {
						resource: ['svm'],
						operation: ['create'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'Default',
					},
				],
				description: 'IPspace for the SVM (default: Default)',
			},
			{
				displayName: 'Root Volume Aggregate',
				name: 'rootVolumeAggregate',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				displayOptions: {
					show: {
						resource: ['svm'],
						operation: ['create'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'aggr1',
					},
				],
				description: 'Aggregate for the SVM root volume',
			},
			{
				displayName: 'Additional Options',
				name: 'createOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['svm'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: [
							{ name: 'C (POSIX)', value: 'c' },
							{ name: 'C.UTF-8', value: 'c.utf_8' },
							{ name: 'English (US) - UTF-8', value: 'en_us.utf_8' },
							{ name: 'German - UTF-8', value: 'de.utf_8' },
							{ name: 'French - UTF-8', value: 'fr.utf_8' },
							{ name: 'Japanese - UTF-8', value: 'ja.utf_8' },
							{ name: 'Chinese Simplified - UTF-8', value: 'zh.utf_8' },
							{ name: 'Chinese Traditional - UTF-8', value: 'zh_tw.utf_8' },
						],
						default: 'c.utf_8',
						description: 'Language encoding for the SVM',
					},
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
						description: 'Comment or description for the SVM',
					},
					{
						displayName: 'Subtype',
						name: 'subtype',
						type: 'options',
						options: [
							{ name: 'Default', value: 'default' },
							{ name: 'Sync Source', value: 'sync_source' },
							{ name: 'Sync Destination', value: 'sync_destination' },
							{ name: 'DP Destination', value: 'dp_destination' },
						],
						default: 'default',
						description: 'SVM subtype',
					},
					{
						displayName: 'Snapshot Policy',
						name: 'snapshotPolicy',
						type: 'string',
						default: '',
						description: 'Snapshot policy for the SVM root volume',
					},
					{
						displayName: 'Max Volumes',
						name: 'maxVolumes',
						type: 'number',
						default: 0,
						description: 'Maximum number of volumes (0 = unlimited)',
					},
				],
			},

			// Protocol Options
			{
				displayName: 'Protocols',
				name: 'protocols',
				type: 'collection',
				placeholder: 'Configure Protocols',
				default: {},
				displayOptions: {
					show: {
						resource: ['svm'],
						operation: ['create', 'update'],
					},
				},
				options: [
					{
						displayName: 'Enable NFS',
						name: 'nfsEnabled',
						type: 'boolean',
						default: false,
						description: 'Whether to enable NFS protocol',
					},
					{
						displayName: 'Enable CIFS/SMB',
						name: 'cifsEnabled',
						type: 'boolean',
						default: false,
						description: 'Whether to enable CIFS/SMB protocol',
					},
					{
						displayName: 'Enable iSCSI',
						name: 'iscsiEnabled',
						type: 'boolean',
						default: false,
						description: 'Whether to enable iSCSI protocol',
					},
					{
						displayName: 'Enable FC',
						name: 'fcpEnabled',
						type: 'boolean',
						default: false,
						description: 'Whether to enable Fibre Channel protocol',
					},
					{
						displayName: 'Enable NVMe/FC',
						name: 'nvmeEnabled',
						type: 'boolean',
						default: false,
						description: 'Whether to enable NVMe over Fabrics protocol',
					},
					{
						displayName: 'Enable S3',
						name: 's3Enabled',
						type: 'boolean',
						default: false,
						description: 'Whether to enable S3 object storage',
					},
				],
			},

			// SVM Update Fields
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['svm'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'New name for the SVM',
					},
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
						description: 'Comment or description',
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: '',
						description: 'Language encoding',
					},
					{
						displayName: 'Max Volumes',
						name: 'max_volumes',
						type: 'number',
						default: 0,
						description: 'Maximum number of volumes allowed',
					},
				],
			},

			// Aggregates Assignment
			{
				displayName: 'Assigned Aggregates',
				name: 'aggregates',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['svm'],
						operation: ['create', 'update'],
					},
				},
				description: 'Comma-separated list of aggregate names to assign to this SVM',
			},

			// ===================
			// SVM PEER OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['svmPeer'],
					},
				},
				options: [
					{
						name: 'Accept',
						value: 'accept',
						description: 'Accept a pending peer relationship',
						action: 'Accept SVM peer',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new SVM peer relationship',
						action: 'Create SVM peer',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an SVM peer relationship',
						action: 'Delete SVM peer',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get SVM peer details',
						action: 'Get SVM peer',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all SVM peer relationships',
						action: 'Get many SVM peers',
					},
				],
				default: 'getMany',
			},

			// Peer UUID
			{
				displayName: 'Peer UUID',
				name: 'peerUuid',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['svmPeer'],
						operation: ['get', 'delete', 'accept'],
					},
				},
				description: 'UUID of the peer relationship',
			},

			// Peer Create Fields
			{
				displayName: 'Local SVM',
				name: 'localSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['svmPeer'],
						operation: ['create'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'svm1',
					},
				],
			},
			{
				displayName: 'Peer Cluster',
				name: 'peerCluster',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['svmPeer'],
						operation: ['create'],
					},
				},
				description: 'Name of the peer cluster',
			},
			{
				displayName: 'Peer SVM',
				name: 'peerSvm',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['svmPeer'],
						operation: ['create'],
					},
				},
				description: 'Name of the peer SVM on the remote cluster',
			},
			{
				displayName: 'Applications',
				name: 'peerApplications',
				type: 'multiOptions',
				options: [
					{ name: 'FlexCache', value: 'flexcache' },
					{ name: 'SnapMirror', value: 'snapmirror' },
				],
				default: ['snapmirror'],
				displayOptions: {
					show: {
						resource: ['svmPeer'],
						operation: ['create'],
					},
				},
				description: 'Applications that can use this peer relationship',
			},

			// List Filters
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
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

			// Additional Options
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
						description: 'Comma-separated list of fields to include (use * for all)',
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

				// Helper to resolve SVM by name to UUID
				const resolveSvmId = async (locator: { mode: string; value: string }): Promise<string> => {
					if (locator.mode === 'name') {
						const svms = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, { name: locator.value });
						if (svms.length === 0) {
							throw new Error(`SVM "${locator.value}" not found`);
						}
						return svms[0].uuid as string;
					}
					return locator.value;
				};

				// ========== SVM ==========
				if (resource === 'svm') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/svm/svms', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, qs);
						}
					} else if (operation === 'get') {
						const svmLocator = this.getNodeParameter('svmId', i) as { mode: string; value: string };
						const svmId = await resolveSvmId(svmLocator);
						responseData = await ontapApiRequest.call(this, 'GET', `/svm/svms/${svmId}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('svmName', i) as string;
						const ipspaceLocator = this.getNodeParameter('ipspace', i, { mode: 'name', value: '' }) as { mode: string; value: string };
						const aggrLocator = this.getNodeParameter('rootVolumeAggregate', i, { mode: 'name', value: '' }) as { mode: string; value: string };
						const createOptions = this.getNodeParameter('createOptions', i, {}) as IDataObject;
						const protocols = this.getNodeParameter('protocols', i, {}) as IDataObject;
						const aggregates = this.getNodeParameter('aggregates', i, '') as string;

						const body: IDataObject = { name };

						if (ipspaceLocator.value) {
							body.ipspace = { name: ipspaceLocator.value };
						}

						if (aggrLocator.value) {
							body.aggregates = [{ name: aggrLocator.value }];
						}

						if (createOptions.language) body.language = createOptions.language;
						if (createOptions.comment) body.comment = createOptions.comment;
						if (createOptions.subtype) body.subtype = createOptions.subtype;
						if (createOptions.maxVolumes) body.max_volumes = createOptions.maxVolumes;
						if (createOptions.snapshotPolicy) {
							body.snapshot_policy = { name: createOptions.snapshotPolicy };
						}

						// Protocol configuration
						if (protocols.nfsEnabled !== undefined) {
							body.nfs = { enabled: protocols.nfsEnabled };
						}
						if (protocols.cifsEnabled !== undefined) {
							body.cifs = { enabled: protocols.cifsEnabled };
						}
						if (protocols.iscsiEnabled !== undefined) {
							body.iscsi = { enabled: protocols.iscsiEnabled };
						}
						if (protocols.fcpEnabled !== undefined) {
							body.fcp = { enabled: protocols.fcpEnabled };
						}
						if (protocols.nvmeEnabled !== undefined) {
							body.nvme = { enabled: protocols.nvmeEnabled };
						}
						if (protocols.s3Enabled !== undefined) {
							body.s3 = { enabled: protocols.s3Enabled };
						}

						// Aggregates assignment
						if (aggregates) {
							body.aggregates = aggregates.split(',').map(a => ({ name: a.trim() }));
						}

						const response = await ontapApiRequest.call(this, 'POST', '/svm/svms', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const svmLocator = this.getNodeParameter('svmId', i) as { mode: string; value: string };
						const svmId = await resolveSvmId(svmLocator);
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const protocols = this.getNodeParameter('protocols', i, {}) as IDataObject;
						const aggregates = this.getNodeParameter('aggregates', i, '') as string;

						const body: IDataObject = { ...updateFields };

						// Protocol updates
						if (protocols.nfsEnabled !== undefined) body.nfs = { enabled: protocols.nfsEnabled };
						if (protocols.cifsEnabled !== undefined) body.cifs = { enabled: protocols.cifsEnabled };
						if (protocols.iscsiEnabled !== undefined) body.iscsi = { enabled: protocols.iscsiEnabled };
						if (protocols.fcpEnabled !== undefined) body.fcp = { enabled: protocols.fcpEnabled };
						if (protocols.nvmeEnabled !== undefined) body.nvme = { enabled: protocols.nvmeEnabled };
						if (protocols.s3Enabled !== undefined) body.s3 = { enabled: protocols.s3Enabled };

						if (aggregates) {
							body.aggregates = aggregates.split(',').map(a => ({ name: a.trim() }));
						}

						const response = await ontapApiRequest.call(this, 'PATCH', `/svm/svms/${svmId}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const svmLocator = this.getNodeParameter('svmId', i) as { mode: string; value: string };
						const svmId = await resolveSvmId(svmLocator);
						
						const response = await ontapApiRequest.call(this, 'DELETE', `/svm/svms/${svmId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: svmId };
						}
					} else if (operation === 'start') {
						const svmLocator = this.getNodeParameter('svmId', i) as { mode: string; value: string };
						const svmId = await resolveSvmId(svmLocator);
						
						const response = await ontapApiRequest.call(this, 'PATCH', `/svm/svms/${svmId}`, { state: 'running' });
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'stop') {
						const svmLocator = this.getNodeParameter('svmId', i) as { mode: string; value: string };
						const svmId = await resolveSvmId(svmLocator);
						
						const response = await ontapApiRequest.call(this, 'PATCH', `/svm/svms/${svmId}`, { state: 'stopped' });
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== SVM PEER ==========
				else if (resource === 'svmPeer') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/svm/peers', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/svm/peers', {}, qs);
						}
					} else if (operation === 'get') {
						const peerUuid = this.getNodeParameter('peerUuid', i) as string;
						responseData = await ontapApiRequest.call(this, 'GET', `/svm/peers/${peerUuid}`, {}, qs);
					} else if (operation === 'create') {
						const localSvmLocator = this.getNodeParameter('localSvm', i) as { mode: string; value: string };
						const peerCluster = this.getNodeParameter('peerCluster', i) as string;
						const peerSvm = this.getNodeParameter('peerSvm', i) as string;
						const applications = this.getNodeParameter('peerApplications', i) as string[];

						const body: IDataObject = {
							svm: { name: localSvmLocator.value },
							peer: {
								svm: { name: peerSvm },
								cluster: { name: peerCluster },
							},
							applications,
						};

						const response = await ontapApiRequest.call(this, 'POST', '/svm/peers', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'accept') {
						const peerUuid = this.getNodeParameter('peerUuid', i) as string;
						
						const response = await ontapApiRequest.call(this, 'PATCH', `/svm/peers/${peerUuid}`, { state: 'peered' });
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const peerUuid = this.getNodeParameter('peerUuid', i) as string;
						
						await ontapApiRequest.call(this, 'DELETE', `/svm/peers/${peerUuid}`);
						responseData = { success: true, deleted: peerUuid };
					}
				}

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
