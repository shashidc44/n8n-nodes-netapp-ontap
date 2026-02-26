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

export class NetAppOntapSnapMirror implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NetApp ONTAP SnapMirror',
		name: 'netAppOntapSnapMirror',
		icon: 'file:netapp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage NetApp ONTAP SnapMirror relationships and data protection',
		defaults: {
			name: 'ONTAP SnapMirror',
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
						name: 'Policy',
						value: 'policy',
						description: 'Manage SnapMirror policies',
					},
					{
						name: 'Relationship',
						value: 'relationship',
						description: 'Manage SnapMirror relationships',
					},
					{
						name: 'Transfer',
						value: 'transfer',
						description: 'Manage SnapMirror transfers',
					},
				],
				default: 'relationship',
			},

			// ===================
			// RELATIONSHIP OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['relationship'],
					},
				},
				options: [
					{
						name: 'Abort',
						value: 'abort',
						description: 'Abort an in-progress SnapMirror transfer',
						action: 'Abort SnapMirror transfer',
					},
					{
						name: 'Break',
						value: 'break',
						description: 'Break a SnapMirror relationship',
						action: 'Break SnapMirror relationship',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new SnapMirror relationship',
						action: 'Create SnapMirror relationship',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a SnapMirror relationship',
						action: 'Delete SnapMirror relationship',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get SnapMirror relationship details',
						action: 'Get SnapMirror relationship',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all SnapMirror relationships',
						action: 'Get many SnapMirror relationships',
					},
					{
						name: 'Initialize',
						value: 'initialize',
						description: 'Initialize a SnapMirror relationship',
						action: 'Initialize SnapMirror relationship',
					},
					{
						name: 'Quiesce',
						value: 'quiesce',
						description: 'Quiesce a SnapMirror relationship',
						action: 'Quiesce SnapMirror relationship',
					},
					{
						name: 'Release',
						value: 'release',
						description: 'Release a SnapMirror relationship from source',
						action: 'Release SnapMirror relationship',
					},
					{
						name: 'Resync',
						value: 'resync',
						description: 'Resync a SnapMirror relationship',
						action: 'Resync SnapMirror relationship',
					},
					{
						name: 'Resume',
						value: 'resume',
						description: 'Resume a quiesced SnapMirror relationship',
						action: 'Resume SnapMirror relationship',
					},
					{
						name: 'Restore',
						value: 'restore',
						description: 'Restore from a SnapMirror destination',
						action: 'Restore from SnapMirror',
					},
					{
						name: 'Reverse Resync',
						value: 'reverseResync',
						description: 'Reverse resync a broken SnapMirror relationship',
						action: 'Reverse resync SnapMirror',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Trigger SnapMirror update (manual transfer)',
						action: 'Update SnapMirror relationship',
					},
				],
				default: 'getMany',
			},

			// Relationship Selection
			{
				displayName: 'Relationship',
				name: 'relationshipId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['relationship'],
						operation: ['get', 'delete', 'initialize', 'update', 'break', 'quiesce', 'resume', 'resync', 'abort', 'restore', 'reverseResync', 'release'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// Relationship Create Fields
			{
				displayName: 'Source SVM',
				name: 'sourceSvm',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['relationship'],
						operation: ['create'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},
			{
				displayName: 'Source Path',
				name: 'sourcePath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['relationship'],
						operation: ['create'],
					},
				},
				placeholder: 'svm1:vol1',
				description: 'Source path in format svm:volume or svm:volume/qtree for SVM-DR use just svm:',
			},
			{
				displayName: 'Destination SVM',
				name: 'destSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['relationship'],
						operation: ['create'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},
			{
				displayName: 'Destination Path',
				name: 'destPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['relationship'],
						operation: ['create'],
					},
				},
				placeholder: 'svm2:vol1_dest',
				description: 'Destination path in format svm:volume',
			},

			// Relationship Create Options
			{
				displayName: 'Additional Options',
				name: 'relationshipCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['relationship'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Create Destination',
						name: 'createDestination',
						type: 'boolean',
						default: false,
						description: 'Whether to create the destination volume automatically',
					},
					{
						displayName: 'Destination Aggregate',
						name: 'destAggregate',
						type: 'string',
						default: '',
						description: 'Aggregate for destination volume (if creating)',
					},
					{
						displayName: 'Identity Preservation',
						name: 'identityPreservation',
						type: 'options',
						options: [
							{ name: 'Exclude Network Config', value: 'exclude_network_config' },
							{ name: 'Exclude Network and Protocol Config', value: 'exclude_network_and_protocol_config' },
							{ name: 'Full', value: 'full' },
						],
						default: 'exclude_network_config',
						description: 'For SVM-DR relationships',
					},
					{
						displayName: 'Initialize on Create',
						name: 'initializeOnCreate',
						type: 'boolean',
						default: true,
						description: 'Whether to start initial transfer automatically',
					},
					{
						displayName: 'Policy',
						name: 'policy',
						type: 'resourceLocator',
						default: { mode: 'name', value: '' },
						modes: [							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
							},
						],
					},
					{
						displayName: 'Schedule',
						name: 'schedule',
						type: 'resourceLocator',
						default: { mode: 'name', value: '' },
						modes: [							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
							},
						],
					},
				],
			},

			// Restore Options
			{
				displayName: 'Restore Options',
				name: 'restoreOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['relationship'],
						operation: ['restore'],
					},
				},
				options: [
					{
						displayName: 'Source Snapshot',
						name: 'sourceSnapshot',
						type: 'string',
						default: '',
						description: 'Snapshot to restore from',
					},
					{
						displayName: 'Destination Path',
						name: 'destPath',
						type: 'string',
						default: '',
						description: 'Path for restored volume',
					},
				],
			},

			// ===================
			// TRANSFER OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['transfer'],
					},
				},
				options: [
					{
						name: 'Abort',
						value: 'abort',
						description: 'Abort an in-progress transfer',
						action: 'Abort transfer',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get transfer details',
						action: 'Get transfer',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all transfers for a relationship',
						action: 'Get many transfers',
					},
					{
						name: 'Start',
						value: 'start',
						description: 'Start a new transfer',
						action: 'Start transfer',
					},
				],
				default: 'getMany',
			},

			// Transfer Relationship Selection
			{
				displayName: 'Relationship',
				name: 'transferRelationship',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['transfer'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// Transfer ID
			{
				displayName: 'Transfer UUID',
				name: 'transferId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['transfer'],
						operation: ['get', 'abort'],
					},
				},
			},

			// Transfer Start Options
			{
				displayName: 'Transfer Options',
				name: 'transferStartOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['transfer'],
						operation: ['start'],
					},
				},
				options: [
					{
						displayName: 'Source Snapshot',
						name: 'sourceSnapshot',
						type: 'string',
						default: '',
						description: 'Transfer a specific snapshot',
					},
					{
						displayName: 'Throttle (KB/s)',
						name: 'throttle',
						type: 'number',
						default: 0,
						description: 'Maximum transfer rate (0 for unlimited)',
					},
				],
			},

			// ===================
			// POLICY OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['policy'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new SnapMirror policy',
						action: 'Create SnapMirror policy',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a SnapMirror policy',
						action: 'Delete SnapMirror policy',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get SnapMirror policy details',
						action: 'Get SnapMirror policy',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all SnapMirror policies',
						action: 'Get many SnapMirror policies',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update SnapMirror policy',
						action: 'Update SnapMirror policy',
					},
				],
				default: 'getMany',
			},

			// Policy Selection
			{
				displayName: 'Policy',
				name: 'policyId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['policy'],
						operation: ['get', 'update', 'delete'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// Policy Create Fields
			{
				displayName: 'Policy Name',
				name: 'policyName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['policy'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'SVM',
				name: 'policySvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				displayOptions: {
					show: {
						resource: ['policy'],
						operation: ['create'],
					},
				},
				description: 'SVM for the policy (leave empty for cluster-scoped)',
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},
			{
				displayName: 'Policy Type',
				name: 'policyType',
				type: 'options',
				options: [
					{ name: 'Async', value: 'async' },
					{ name: 'Sync', value: 'sync' },
				],
				default: 'async',
				required: true,
				displayOptions: {
					show: {
						resource: ['policy'],
						operation: ['create'],
					},
				},
			},

			// Policy Create Options
			{
				displayName: 'Additional Options',
				name: 'policyCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['policy'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Identity Preservation',
						name: 'identityPreservation',
						type: 'options',
						options: [
							{ name: 'Exclude Network Config', value: 'exclude_network_config' },
							{ name: 'Exclude Network and Protocol Config', value: 'exclude_network_and_protocol_config' },
							{ name: 'Full', value: 'full' },
						],
						default: 'exclude_network_config',
					},
					{
						displayName: 'Network Compression Enabled',
						name: 'networkCompressionEnabled',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Sync Common Snapshot Schedule',
						name: 'syncCommonSnapshotSchedule',
						type: 'resourceLocator',
						default: { mode: 'name', value: '' },
						modes: [							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
							},
						],
						description: 'For sync policies',
					},
					{
						displayName: 'Sync Type',
						name: 'syncType',
						type: 'options',
						options: [
							{ name: 'Automated Failover', value: 'automated_failover' },
							{ name: 'Automated Failover Duplex', value: 'automated_failover_duplex' },
							{ name: 'Strict Sync', value: 'strict_sync' },
							{ name: 'Sync', value: 'sync' },
						],
						default: 'sync',
						description: 'For sync policies',
					},
					{
						displayName: 'Throttle (KB/s)',
						name: 'throttle',
						type: 'number',
						default: 0,
						description: 'Max transfer rate (0 for unlimited)',
					},
					{
						displayName: 'Transfer Schedule',
						name: 'transferSchedule',
						type: 'resourceLocator',
						default: { mode: 'name', value: '' },
						modes: [							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
							},
						],
					},
				],
			},

			// Policy Update Fields
			{
				displayName: 'Update Fields',
				name: 'policyUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['policy'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Network Compression Enabled',
						name: 'networkCompressionEnabled',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Throttle (KB/s)',
						name: 'throttle',
						type: 'number',
						default: 0,
					},
				],
			},

			// Common Filters
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

			// Common Options
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

				// ========== RELATIONSHIP ==========
				if (resource === 'relationship') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/snapmirror/relationships', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/snapmirror/relationships', {}, qs);
						}
					} else if (operation === 'get') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };
						responseData = await ontapApiRequest.call(this, 'GET', `/snapmirror/relationships/${relLocator.value}`, {}, qs);
					} else if (operation === 'create') {
						const sourceSvmLocator = this.getNodeParameter('sourceSvm', i) as { mode: string; value: string };
						const sourcePath = this.getNodeParameter('sourcePath', i) as string;
						const destSvmLocator = this.getNodeParameter('destSvm', i) as { mode: string; value: string };
						const destPath = this.getNodeParameter('destPath', i) as string;
						const createOptions = this.getNodeParameter('relationshipCreateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							source: {
								path: sourcePath.includes(':') ? sourcePath : `${sourceSvmLocator.value}:${sourcePath}`,
							},
							destination: {
								path: destPath.includes(':') ? destPath : `${destSvmLocator.value}:${destPath}`,
							},
						};

						if (createOptions.createDestination) {
							(body.destination as IDataObject).path = destPath;
							body.create_destination = {
								enabled: true,
							};
							if (createOptions.destAggregate) {
								(body.create_destination as IDataObject).storage_service = {
									name: createOptions.destAggregate,
								};
							}
						}

						if (createOptions.policy) {
							const policyLocator = createOptions.policy as { mode: string; value: string };
							body.policy = { uuid: policyLocator.value };
						}

						if (createOptions.schedule) {
							const schedLocator = createOptions.schedule as { mode: string; value: string };
							body.transfer_schedule = { name: schedLocator.value };
						}

						if (createOptions.identityPreservation) {
							body.identity_preservation = createOptions.identityPreservation;
						}

						const response = await ontapApiRequest.call(this, 'POST', '/snapmirror/relationships', body);
						responseData = await handleAsyncResponse.call(this, response);

						// Initialize if requested
						if (createOptions.initializeOnCreate !== false && responseData.uuid) {
							await ontapApiRequest.call(this, 'POST', `/snapmirror/relationships/${responseData.uuid}/transfers`);
						}
					} else if (operation === 'delete') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'DELETE', `/snapmirror/relationships/${relLocator.value}`, {}, {
							destination_only: false,
							source_only: false,
						});
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: relLocator.value };
						}
					} else if (operation === 'initialize') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'POST', `/snapmirror/relationships/${relLocator.value}/transfers`);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };

						// Trigger manual update/transfer
						const response = await ontapApiRequest.call(this, 'POST', `/snapmirror/relationships/${relLocator.value}/transfers`);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'break') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'PATCH', `/snapmirror/relationships/${relLocator.value}`, {
							state: 'broken_off',
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'quiesce') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'PATCH', `/snapmirror/relationships/${relLocator.value}`, {
							state: 'paused',
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'resume') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'PATCH', `/snapmirror/relationships/${relLocator.value}`, {
							state: 'snapmirrored',
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'resync') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'PATCH', `/snapmirror/relationships/${relLocator.value}`, {
							state: 'snapmirrored',
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'reverseResync') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };

						// Get current relationship to swap source and destination
						const currentRel = await ontapApiRequest.call(this, 'GET', `/snapmirror/relationships/${relLocator.value}`) as IDataObject;

						const response = await ontapApiRequest.call(this, 'PATCH', `/snapmirror/relationships/${relLocator.value}`, {
							source: { path: (currentRel.destination as IDataObject)?.path },
							destination: { path: (currentRel.source as IDataObject)?.path },
							state: 'snapmirrored',
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'abort') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };

						// Get current transfer
						const transfers = await ontapApiRequest.call(this, 'GET', `/snapmirror/relationships/${relLocator.value}/transfers`, {}, { state: 'transferring' });
						if ((transfers.records as IDataObject[])?.length > 0) {
							const transferUuid = ((transfers.records as IDataObject[])[0] as IDataObject).uuid;
							const response = await ontapApiRequest.call(this, 'PATCH', `/snapmirror/relationships/${relLocator.value}/transfers/${transferUuid}`, {
								state: 'aborted',
							});
							responseData = await handleAsyncResponse.call(this, response);
						} else {
							responseData = { message: 'No active transfer to abort' };
						}
					} else if (operation === 'restore') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };
						const restoreOptions = this.getNodeParameter('restoreOptions', i, {}) as IDataObject;

						const body: IDataObject = {};
						if (restoreOptions.sourceSnapshot) {
							body.source_snapshot = restoreOptions.sourceSnapshot;
						}

						const response = await ontapApiRequest.call(this, 'POST', `/snapmirror/relationships/${relLocator.value}/transfers`, body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'release') {
						const relLocator = this.getNodeParameter('relationshipId', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'DELETE', `/snapmirror/relationships/${relLocator.value}`, {}, {
							source_only: true,
						});
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, released: relLocator.value };
						}
					}
				}

				// ========== TRANSFER ==========
				else if (resource === 'transfer') {
					const relLocator = this.getNodeParameter('transferRelationship', i) as { mode: string; value: string };

					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', `/snapmirror/relationships/${relLocator.value}/transfers`, {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', `/snapmirror/relationships/${relLocator.value}/transfers`, {}, qs);
						}
					} else if (operation === 'get') {
						const transferId = this.getNodeParameter('transferId', i) as string;
						responseData = await ontapApiRequest.call(this, 'GET', `/snapmirror/relationships/${relLocator.value}/transfers/${transferId}`, {}, qs);
					} else if (operation === 'start') {
						const startOptions = this.getNodeParameter('transferStartOptions', i, {}) as IDataObject;

						const body: IDataObject = {};
						if (startOptions.sourceSnapshot) {
							body.source_snapshot = startOptions.sourceSnapshot;
						}
						if (startOptions.throttle) {
							body.throttle = startOptions.throttle;
						}

						const response = await ontapApiRequest.call(this, 'POST', `/snapmirror/relationships/${relLocator.value}/transfers`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'abort') {
						const transferId = this.getNodeParameter('transferId', i) as string;

						const response = await ontapApiRequest.call(this, 'PATCH', `/snapmirror/relationships/${relLocator.value}/transfers/${transferId}`, {
							state: 'aborted',
						});
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== POLICY ==========
				else if (resource === 'policy') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/snapmirror/policies', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/snapmirror/policies', {}, qs);
						}
					} else if (operation === 'get') {
						const policyLocator = this.getNodeParameter('policyId', i) as { mode: string; value: string };
						responseData = await ontapApiRequest.call(this, 'GET', `/snapmirror/policies/${policyLocator.value}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('policyName', i) as string;
						const svmLocator = this.getNodeParameter('policySvm', i, { value: '' }) as { mode: string; value: string };
						const policyType = this.getNodeParameter('policyType', i) as string;
						const createOptions = this.getNodeParameter('policyCreateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							name,
							type: policyType,
						};

						if (svmLocator?.value) {
							body.svm = { name: svmLocator.value };
						}

						if (createOptions.comment) body.comment = createOptions.comment;
						if (createOptions.networkCompressionEnabled !== undefined) {
							body.network_compression_enabled = createOptions.networkCompressionEnabled;
						}
						if (createOptions.throttle) body.throttle = createOptions.throttle;
						if (createOptions.identityPreservation) {
							body.identity_preservation = createOptions.identityPreservation;
						}

						if (policyType === 'sync') {
							if (createOptions.syncType) body.sync_type = createOptions.syncType;
							if (createOptions.syncCommonSnapshotSchedule) {
								const schedLocator = createOptions.syncCommonSnapshotSchedule as { mode: string; value: string };
								body.sync_common_snapshot_schedule = { name: schedLocator.value };
							}
						}

						if (createOptions.transferSchedule) {
							const schedLocator = createOptions.transferSchedule as { mode: string; value: string };
							body.transfer_schedule = { name: schedLocator.value };
						}

						const response = await ontapApiRequest.call(this, 'POST', '/snapmirror/policies', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const policyLocator = this.getNodeParameter('policyId', i) as { mode: string; value: string };
						const updateFields = this.getNodeParameter('policyUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.comment) body.comment = updateFields.comment;
						if (updateFields.networkCompressionEnabled !== undefined) {
							body.network_compression_enabled = updateFields.networkCompressionEnabled;
						}
						if (updateFields.throttle !== undefined) body.throttle = updateFields.throttle;

						const response = await ontapApiRequest.call(this, 'PATCH', `/snapmirror/policies/${policyLocator.value}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const policyLocator = this.getNodeParameter('policyId', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'DELETE', `/snapmirror/policies/${policyLocator.value}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: policyLocator.value };
						}
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
