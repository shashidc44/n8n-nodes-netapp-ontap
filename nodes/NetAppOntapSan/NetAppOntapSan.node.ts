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
	parseSize,
	parseApiFilters,
} from '../shared/GenericFunctions';

export class NetAppOntapSan implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NetApp ONTAP SAN',
		name: 'netAppOntapSan',
		icon: 'file:netapp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage NetApp ONTAP LUNs, igroups, FC interfaces, and protocols',
		defaults: {
			name: 'ONTAP SAN',
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
						name: 'FC Interface',
						value: 'fcInterface',
						description: 'Manage Fibre Channel interfaces',
					},
					{
						name: 'FCP Service',
						value: 'fcpService',
						description: 'Manage FCP services',
					},
					{
						name: 'Igroup',
						value: 'igroup',
						description: 'Manage initiator groups',
					},
					{
						name: 'iSCSI Service',
						value: 'iscsiService',
						description: 'Manage iSCSI services',
					},
					{
						name: 'LUN',
						value: 'lun',
						description: 'Manage LUNs',
					},
					{
						name: 'LUN Map',
						value: 'lunMap',
						description: 'Manage LUN mappings',
					},
				],
				default: 'lun',
			},

			// ===================
			// LUN OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['lun'],
					},
				},
				options: [
					{
						name: 'Clone',
						value: 'clone',
						description: 'Clone a LUN',
						action: 'Clone LUN',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new LUN',
						action: 'Create LUN',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a LUN',
						action: 'Delete LUN',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get LUN details',
						action: 'Get LUN',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all LUNs',
						action: 'Get many LUNs',
					},
					{
						name: 'Offline',
						value: 'offline',
						description: 'Take a LUN offline',
						action: 'Offline LUN',
					},
					{
						name: 'Online',
						value: 'online',
						description: 'Bring a LUN online',
						action: 'Online LUN',
					},
					{
						name: 'Resize',
						value: 'resize',
						description: 'Resize a LUN',
						action: 'Resize LUN',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update LUN properties',
						action: 'Update LUN',
					},
				],
				default: 'getMany',
			},

			// LUN Selection
			{
				displayName: 'LUN',
				name: 'lunId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['lun'],
						operation: ['get', 'update', 'delete', 'resize', 'online', 'offline', 'clone'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
					{
						displayName: 'By Path',
						name: 'path',
						type: 'string',
						placeholder: '/vol/vol1/lun1',
					},
				],
			},

			// LUN Create Fields
			{
				displayName: 'LUN Name',
				name: 'lunName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['lun'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'SVM',
				name: 'lunSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['lun'],
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
				displayName: 'Volume',
				name: 'lunVolume',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['lun'],
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
				displayName: 'Size',
				name: 'lunSize',
				type: 'string',
				default: '10GB',
				required: true,
				displayOptions: {
					show: {
						resource: ['lun'],
						operation: ['create'],
					},
				},
				description: 'Size of the LUN (e.g., 10GB, 1TB)',
			},
			{
				displayName: 'OS Type',
				name: 'lunOsType',
				type: 'options',
				options: [
					{ name: 'AIX', value: 'aix' },
					{ name: 'HP-UX', value: 'hpux' },
					{ name: 'Hyper-V', value: 'hyper_v' },
					{ name: 'Linux', value: 'linux' },
					{ name: 'NetWare', value: 'netware' },
					{ name: 'OpenVMS', value: 'openvms' },
					{ name: 'Solaris', value: 'solaris' },
					{ name: 'Solaris EFI', value: 'solaris_efi' },
					{ name: 'VMware', value: 'vmware' },
					{ name: 'Windows', value: 'windows' },
					{ name: 'Windows 2008', value: 'windows_2008' },
					{ name: 'Windows GPT', value: 'windows_gpt' },
					{ name: 'Xen', value: 'xen' },
				],
				default: 'linux',
				required: true,
				displayOptions: {
					show: {
						resource: ['lun'],
						operation: ['create'],
					},
				},
			},

			// LUN Create Options
			{
				displayName: 'Additional Options',
				name: 'lunCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['lun'],
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
						displayName: 'QoS Policy',
						name: 'qosPolicy',
						type: 'string',
						default: '',
						description: 'QoS policy group name',
					},
					{
						displayName: 'Space Reserve',
						name: 'spaceReserve',
						type: 'boolean',
						default: true,
						description: 'Whether to reserve space for the LUN',
					},
					{
						displayName: 'Qtree',
						name: 'qtree',
						type: 'string',
						default: '',
						description: 'Qtree name within the volume',
					},
				],
			},

			// LUN Resize
			{
				displayName: 'New Size',
				name: 'lunNewSize',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['lun'],
						operation: ['resize'],
					},
				},
				description: 'New size for the LUN (e.g., 20GB)',
			},

			// LUN Clone Fields
			{
				displayName: 'Clone Name',
				name: 'lunCloneName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['lun'],
						operation: ['clone'],
					},
				},
			},

			// LUN Update Fields
			{
				displayName: 'Update Fields',
				name: 'lunUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lun'],
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
						displayName: 'QoS Policy',
						name: 'qosPolicy',
						type: 'string',
						default: '',
					},
					{
						displayName: 'New Name',
						name: 'name',
						type: 'string',
						default: '',
					},
				],
			},

			// ===================
			// IGROUP OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['igroup'],
					},
				},
				options: [
					{
						name: 'Add Initiator',
						value: 'addInitiator',
						description: 'Add an initiator to an igroup',
						action: 'Add initiator to igroup',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new igroup',
						action: 'Create igroup',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an igroup',
						action: 'Delete igroup',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get igroup details',
						action: 'Get igroup',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all igroups',
						action: 'Get many igroups',
					},
					{
						name: 'Remove Initiator',
						value: 'removeInitiator',
						description: 'Remove an initiator from an igroup',
						action: 'Remove initiator from igroup',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update igroup properties',
						action: 'Update igroup',
					},
				],
				default: 'getMany',
			},

			// Igroup Selection
			{
				displayName: 'Igroup',
				name: 'igroupId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['igroup'],
						operation: ['get', 'update', 'delete', 'addInitiator', 'removeInitiator'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},

			// Igroup Create Fields
			{
				displayName: 'Name',
				name: 'igroupName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['igroup'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'SVM',
				name: 'igroupSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['igroup'],
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
				displayName: 'Protocol',
				name: 'igroupProtocol',
				type: 'options',
				options: [
					{ name: 'FCP', value: 'fcp' },
					{ name: 'iSCSI', value: 'iscsi' },
					{ name: 'Mixed', value: 'mixed' },
				],
				default: 'iscsi',
				required: true,
				displayOptions: {
					show: {
						resource: ['igroup'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'OS Type',
				name: 'igroupOsType',
				type: 'options',
				options: [
					{ name: 'AIX', value: 'aix' },
					{ name: 'HP-UX', value: 'hpux' },
					{ name: 'Hyper-V', value: 'hyper_v' },
					{ name: 'Linux', value: 'linux' },
					{ name: 'NetWare', value: 'netware' },
					{ name: 'OpenVMS', value: 'openvms' },
					{ name: 'Solaris', value: 'solaris' },
					{ name: 'VMware', value: 'vmware' },
					{ name: 'Windows', value: 'windows' },
					{ name: 'Xen', value: 'xen' },
				],
				default: 'linux',
				required: true,
				displayOptions: {
					show: {
						resource: ['igroup'],
						operation: ['create'],
					},
				},
			},

			// Igroup Initiators
			{
				displayName: 'Initiators',
				name: 'igroupInitiators',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['igroup'],
						operation: ['create'],
					},
				},
				placeholder: 'iqn.1991-05.com.microsoft:host1',
				description: 'Comma-separated list of initiator IQNs or WWPNs',
			},

			// Igroup Add/Remove Initiator
			{
				displayName: 'Initiator',
				name: 'initiator',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['igroup'],
						operation: ['addInitiator', 'removeInitiator'],
					},
				},
				placeholder: 'iqn.1991-05.com.microsoft:host1',
				description: 'Initiator IQN or WWPN',
			},

			// Igroup Update Fields
			{
				displayName: 'Update Fields',
				name: 'igroupUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['igroup'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'New Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
					},
				],
			},

			// ===================
			// LUN MAP OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['lunMap'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Map a LUN to an igroup',
						action: 'Create LUN mapping',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Remove a LUN mapping',
						action: 'Delete LUN mapping',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all LUN mappings',
						action: 'Get many LUN mappings',
					},
				],
				default: 'getMany',
			},

			// LUN Map LUN
			{
				displayName: 'LUN',
				name: 'lunMapLun',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['lunMap'],
						operation: ['create', 'delete'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// LUN Map Igroup
			{
				displayName: 'Igroup',
				name: 'lunMapIgroup',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['lunMap'],
						operation: ['create', 'delete'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// LUN Map LUN ID
			{
				displayName: 'LUN ID',
				name: 'lunMapId',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						resource: ['lunMap'],
						operation: ['create'],
					},
				},
				description: 'LUN ID for the mapping (leave 0 for auto-assign)',
			},

			// ===================
			// FC INTERFACE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['fcInterface'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new FC interface',
						action: 'Create FC interface',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an FC interface',
						action: 'Delete FC interface',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get FC interface details',
						action: 'Get FC interface',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all FC interfaces',
						action: 'Get many FC interfaces',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update FC interface properties',
						action: 'Update FC interface',
					},
				],
				default: 'getMany',
			},

			// FC Interface Selection
			{
				displayName: 'FC Interface',
				name: 'fcInterfaceId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['fcInterface'],
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

			// FC Interface Create Fields
			{
				displayName: 'Name',
				name: 'fcInterfaceName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['fcInterface'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'SVM',
				name: 'fcInterfaceSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['fcInterface'],
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
				displayName: 'Home Node',
				name: 'fcHomeNode',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['fcInterface'],
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
				displayName: 'Home Port',
				name: 'fcHomePort',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['fcInterface'],
						operation: ['create'],
					},
				},
				placeholder: '0a',
				description: 'FC port name',
			},
			{
				displayName: 'Data Protocol',
				name: 'fcDataProtocol',
				type: 'options',
				options: [
					{ name: 'FCP', value: 'fcp' },
					{ name: 'FC-NVMe', value: 'fc_nvme' },
				],
				default: 'fcp',
				displayOptions: {
					show: {
						resource: ['fcInterface'],
						operation: ['create'],
					},
				},
			},

			// FC Interface Update
			{
				displayName: 'Update Fields',
				name: 'fcInterfaceUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['fcInterface'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Enabled',
						name: 'enabled',
						type: 'boolean',
						default: true,
					},
				],
			},

			// ===================
			// FCP SERVICE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['fcpService'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create FCP service for an SVM',
						action: 'Create FCP service',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete FCP service',
						action: 'Delete FCP service',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get FCP service details',
						action: 'Get FCP service',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all FCP services',
						action: 'Get many FCP services',
					},
					{
						name: 'Start',
						value: 'start',
						description: 'Start FCP service',
						action: 'Start FCP service',
					},
					{
						name: 'Stop',
						value: 'stop',
						description: 'Stop FCP service',
						action: 'Stop FCP service',
					},
				],
				default: 'getMany',
			},

			// FCP Service SVM
			{
				displayName: 'SVM',
				name: 'fcpSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['fcpService'],
						operation: ['create', 'get', 'delete', 'start', 'stop'],
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
				displayName: 'Target Name',
				name: 'fcpTargetName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['fcpService'],
						operation: ['create'],
					},
				},
				description: 'Target name (WWNN). Leave empty for auto-generated.',
			},

			// ===================
			// ISCSI SERVICE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['iscsiService'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create iSCSI service for an SVM',
						action: 'Create iSCSI service',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete iSCSI service',
						action: 'Delete iSCSI service',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get iSCSI service details',
						action: 'Get iSCSI service',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all iSCSI services',
						action: 'Get many iSCSI services',
					},
					{
						name: 'Start',
						value: 'start',
						description: 'Start iSCSI service',
						action: 'Start iSCSI service',
					},
					{
						name: 'Stop',
						value: 'stop',
						description: 'Stop iSCSI service',
						action: 'Stop iSCSI service',
					},
				],
				default: 'getMany',
			},

			// iSCSI Service SVM
			{
				displayName: 'SVM',
				name: 'iscsiSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['iscsiService'],
						operation: ['create', 'get', 'delete', 'start', 'stop'],
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
				displayName: 'Target Name',
				name: 'iscsiTargetName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['iscsiService'],
						operation: ['create'],
					},
				},
				description: 'Target IQN. Leave empty for auto-generated.',
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

				// Helper to resolve LUN
				const resolveLunId = async (locator: { mode: string; value: string }): Promise<string> => {
					if (locator.mode === 'uuid' || locator.mode === 'list') {
						return locator.value;
					}
					// By path
					const luns = await ontapApiRequestAllItems.call(this, 'GET', '/storage/luns', {}, { 'name': locator.value });
					if (luns.length === 0) {
						throw new Error(`LUN "${locator.value}" not found`);
					}
					return luns[0].uuid as string;
				};

				// Helper to resolve igroup
				const resolveIgroupId = async (locator: { mode: string; value: string }, svmName?: string): Promise<string> => {
					if (locator.mode === 'uuid' || locator.mode === 'list') {
						return locator.value;
					}
					const qs: IDataObject = { name: locator.value };
					if (svmName) qs['svm.name'] = svmName;
					const igroups = await ontapApiRequestAllItems.call(this, 'GET', '/protocols/san/igroups', {}, qs);
					if (igroups.length === 0) {
						throw new Error(`Igroup "${locator.value}" not found`);
					}
					return igroups[0].uuid as string;
				};

				// ========== LUN ==========
				if (resource === 'lun') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/storage/luns', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/storage/luns', {}, qs);
						}
					} else if (operation === 'get') {
						const lunLocator = this.getNodeParameter('lunId', i) as { mode: string; value: string };
						const lunId = await resolveLunId(lunLocator);
						responseData = await ontapApiRequest.call(this, 'GET', `/storage/luns/${lunId}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('lunName', i) as string;
						const svmLocator = this.getNodeParameter('lunSvm', i) as { mode: string; value: string };
						const volLocator = this.getNodeParameter('lunVolume', i) as { mode: string; value: string };
						const size = this.getNodeParameter('lunSize', i) as string;
						const osType = this.getNodeParameter('lunOsType', i) as string;
						const createOptions = this.getNodeParameter('lunCreateOptions', i, {}) as IDataObject;

						const lunPath = createOptions.qtree
							? `/vol/${volLocator.value}/${createOptions.qtree}/${name}`
							: `/vol/${volLocator.value}/${name}`;

						const body: IDataObject = {
							name: lunPath,
							svm: { name: svmLocator.value },
							space: { size: parseSize(size) },
							os_type: osType,
						};

						if (createOptions.comment) body.comment = createOptions.comment;
						if (createOptions.qosPolicy) body.qos_policy = { name: createOptions.qosPolicy };
						if (createOptions.spaceReserve !== undefined) {
							body.space = body.space || {};
							(body.space as IDataObject).guarantee = {
								requested: createOptions.spaceReserve,
							};
						}

						const response = await ontapApiRequest.call(this, 'POST', '/storage/luns', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const lunLocator = this.getNodeParameter('lunId', i) as { mode: string; value: string };
						const lunId = await resolveLunId(lunLocator);
						const updateFields = this.getNodeParameter('lunUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.comment) body.comment = updateFields.comment;
						if (updateFields.qosPolicy) body.qos_policy = { name: updateFields.qosPolicy };
						if (updateFields.name) body.name = updateFields.name;

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/luns/${lunId}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const lunLocator = this.getNodeParameter('lunId', i) as { mode: string; value: string };
						const lunId = await resolveLunId(lunLocator);

						const response = await ontapApiRequest.call(this, 'DELETE', `/storage/luns/${lunId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: lunId };
						}
					} else if (operation === 'resize') {
						const lunLocator = this.getNodeParameter('lunId', i) as { mode: string; value: string };
						const lunId = await resolveLunId(lunLocator);
						const newSize = this.getNodeParameter('lunNewSize', i) as string;

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/luns/${lunId}`, {
							space: { size: parseSize(newSize) },
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'online') {
						const lunLocator = this.getNodeParameter('lunId', i) as { mode: string; value: string };
						const lunId = await resolveLunId(lunLocator);

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/luns/${lunId}`, {
							status: { state: 'online' },
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'offline') {
						const lunLocator = this.getNodeParameter('lunId', i) as { mode: string; value: string };
						const lunId = await resolveLunId(lunLocator);

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/luns/${lunId}`, {
							status: { state: 'offline' },
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'clone') {
						const lunLocator = this.getNodeParameter('lunId', i) as { mode: string; value: string };
						const lunId = await resolveLunId(lunLocator);
						const cloneName = this.getNodeParameter('lunCloneName', i) as string;

						// Get source LUN info
						const sourceLun = await ontapApiRequest.call(this, 'GET', `/storage/luns/${lunId}`, {}, { fields: 'svm.name,location.volume.name' }) as IDataObject;
						const svmName = (sourceLun.svm as IDataObject)?.name;
						const volName = ((sourceLun.location as IDataObject)?.volume as IDataObject)?.name;

						const body: IDataObject = {
							name: `/vol/${volName}/${cloneName}`,
							svm: { name: svmName },
							clone: {
								source: { uuid: lunId },
							},
						};

						const response = await ontapApiRequest.call(this, 'POST', '/storage/luns', body);
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== IGROUP ==========
				else if (resource === 'igroup') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/protocols/san/igroups', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/protocols/san/igroups', {}, qs);
						}
					} else if (operation === 'get') {
						const igLocator = this.getNodeParameter('igroupId', i) as { mode: string; value: string };
						const igroupId = await resolveIgroupId(igLocator);
						responseData = await ontapApiRequest.call(this, 'GET', `/protocols/san/igroups/${igroupId}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('igroupName', i) as string;
						const svmLocator = this.getNodeParameter('igroupSvm', i) as { mode: string; value: string };
						const protocol = this.getNodeParameter('igroupProtocol', i) as string;
						const osType = this.getNodeParameter('igroupOsType', i) as string;
						const initiatorsStr = this.getNodeParameter('igroupInitiators', i, '') as string;

						const body: IDataObject = {
							name,
							svm: { name: svmLocator.value },
							protocol,
							os_type: osType,
						};

						if (initiatorsStr) {
							body.initiators = initiatorsStr.split(',').map((init) => ({ name: init.trim() }));
						}

						const response = await ontapApiRequest.call(this, 'POST', '/protocols/san/igroups', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const igLocator = this.getNodeParameter('igroupId', i) as { mode: string; value: string };
						const igroupId = await resolveIgroupId(igLocator);
						const updateFields = this.getNodeParameter('igroupUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.name) body.name = updateFields.name;
						if (updateFields.comment) body.comment = updateFields.comment;

						const response = await ontapApiRequest.call(this, 'PATCH', `/protocols/san/igroups/${igroupId}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const igLocator = this.getNodeParameter('igroupId', i) as { mode: string; value: string };
						const igroupId = await resolveIgroupId(igLocator);

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/san/igroups/${igroupId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: igroupId };
						}
					} else if (operation === 'addInitiator') {
						const igLocator = this.getNodeParameter('igroupId', i) as { mode: string; value: string };
						const igroupId = await resolveIgroupId(igLocator);
						const initiator = this.getNodeParameter('initiator', i) as string;

						const response = await ontapApiRequest.call(this, 'POST', `/protocols/san/igroups/${igroupId}/initiators`, {
							name: initiator,
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'removeInitiator') {
						const igLocator = this.getNodeParameter('igroupId', i) as { mode: string; value: string };
						const igroupId = await resolveIgroupId(igLocator);
						const initiator = this.getNodeParameter('initiator', i) as string;

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/san/igroups/${igroupId}/initiators/${encodeURIComponent(initiator)}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, removed: initiator };
						}
					}
				}

				// ========== LUN MAP ==========
				else if (resource === 'lunMap') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/protocols/san/lun-maps', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/protocols/san/lun-maps', {}, qs);
						}
					} else if (operation === 'create') {
						const lunLocator = this.getNodeParameter('lunMapLun', i) as { mode: string; value: string };
						const igLocator = this.getNodeParameter('lunMapIgroup', i) as { mode: string; value: string };
						const lunMapId = this.getNodeParameter('lunMapId', i) as number;

						const body: IDataObject = {
							lun: { uuid: lunLocator.value },
							igroup: { uuid: igLocator.value },
						};

						if (lunMapId > 0) {
							body.logical_unit_number = lunMapId;
						}

						const response = await ontapApiRequest.call(this, 'POST', '/protocols/san/lun-maps', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const lunLocator = this.getNodeParameter('lunMapLun', i) as { mode: string; value: string };
						const igLocator = this.getNodeParameter('lunMapIgroup', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/san/lun-maps/${lunLocator.value}/${igLocator.value}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: `${lunLocator.value}/${igLocator.value}` };
						}
					}
				}

				// ========== FC INTERFACE ==========
				else if (resource === 'fcInterface') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/network/fc/interfaces', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/network/fc/interfaces', {}, qs);
						}
					} else if (operation === 'get') {
						const fcLocator = this.getNodeParameter('fcInterfaceId', i) as { mode: string; value: string };
						responseData = await ontapApiRequest.call(this, 'GET', `/network/fc/interfaces/${fcLocator.value}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('fcInterfaceName', i) as string;
						const svmLocator = this.getNodeParameter('fcInterfaceSvm', i) as { mode: string; value: string };
						const homeNodeLocator = this.getNodeParameter('fcHomeNode', i) as { mode: string; value: string };
						const homePort = this.getNodeParameter('fcHomePort', i) as string;
						const dataProtocol = this.getNodeParameter('fcDataProtocol', i) as string;

						const body: IDataObject = {
							name,
							svm: { name: svmLocator.value },
							location: {
								home_node: { name: homeNodeLocator.value },
								home_port: { name: homePort },
							},
							data_protocol: dataProtocol,
						};

						const response = await ontapApiRequest.call(this, 'POST', '/network/fc/interfaces', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const fcLocator = this.getNodeParameter('fcInterfaceId', i) as { mode: string; value: string };
						const updateFields = this.getNodeParameter('fcInterfaceUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.enabled !== undefined) body.enabled = updateFields.enabled;

						const response = await ontapApiRequest.call(this, 'PATCH', `/network/fc/interfaces/${fcLocator.value}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const fcLocator = this.getNodeParameter('fcInterfaceId', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'DELETE', `/network/fc/interfaces/${fcLocator.value}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: fcLocator.value };
						}
					}
				}

				// ========== FCP SERVICE ==========
				else if (resource === 'fcpService') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/protocols/san/fcp/services', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/protocols/san/fcp/services', {}, qs);
						}
					} else if (operation === 'get') {
						const svmLocator = this.getNodeParameter('fcpSvm', i) as { mode: string; value: string };
						// Get SVM UUID first
						const svms = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, { name: svmLocator.value });
						if (svms.length === 0) throw new Error(`SVM "${svmLocator.value}" not found`);
						responseData = await ontapApiRequest.call(this, 'GET', `/protocols/san/fcp/services/${svms[0].uuid}`, {}, qs);
					} else if (operation === 'create') {
						const svmLocator = this.getNodeParameter('fcpSvm', i) as { mode: string; value: string };
						const targetName = this.getNodeParameter('fcpTargetName', i, '') as string;

						const body: IDataObject = {
							svm: { name: svmLocator.value },
							enabled: true,
						};

						if (targetName) body.target = { name: targetName };

						const response = await ontapApiRequest.call(this, 'POST', '/protocols/san/fcp/services', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const svmLocator = this.getNodeParameter('fcpSvm', i) as { mode: string; value: string };
						const svms = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, { name: svmLocator.value });
						if (svms.length === 0) throw new Error(`SVM "${svmLocator.value}" not found`);

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/san/fcp/services/${svms[0].uuid}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: svmLocator.value };
						}
					} else if (operation === 'start') {
						const svmLocator = this.getNodeParameter('fcpSvm', i) as { mode: string; value: string };
						const svms = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, { name: svmLocator.value });
						if (svms.length === 0) throw new Error(`SVM "${svmLocator.value}" not found`);

						const response = await ontapApiRequest.call(this, 'PATCH', `/protocols/san/fcp/services/${svms[0].uuid}`, {
							enabled: true,
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'stop') {
						const svmLocator = this.getNodeParameter('fcpSvm', i) as { mode: string; value: string };
						const svms = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, { name: svmLocator.value });
						if (svms.length === 0) throw new Error(`SVM "${svmLocator.value}" not found`);

						const response = await ontapApiRequest.call(this, 'PATCH', `/protocols/san/fcp/services/${svms[0].uuid}`, {
							enabled: false,
						});
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== iSCSI SERVICE ==========
				else if (resource === 'iscsiService') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/protocols/san/iscsi/services', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/protocols/san/iscsi/services', {}, qs);
						}
					} else if (operation === 'get') {
						const svmLocator = this.getNodeParameter('iscsiSvm', i) as { mode: string; value: string };
						const svms = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, { name: svmLocator.value });
						if (svms.length === 0) throw new Error(`SVM "${svmLocator.value}" not found`);
						responseData = await ontapApiRequest.call(this, 'GET', `/protocols/san/iscsi/services/${svms[0].uuid}`, {}, qs);
					} else if (operation === 'create') {
						const svmLocator = this.getNodeParameter('iscsiSvm', i) as { mode: string; value: string };
						const targetName = this.getNodeParameter('iscsiTargetName', i, '') as string;

						const body: IDataObject = {
							svm: { name: svmLocator.value },
							enabled: true,
						};

						if (targetName) body.target = { name: targetName };

						const response = await ontapApiRequest.call(this, 'POST', '/protocols/san/iscsi/services', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const svmLocator = this.getNodeParameter('iscsiSvm', i) as { mode: string; value: string };
						const svms = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, { name: svmLocator.value });
						if (svms.length === 0) throw new Error(`SVM "${svmLocator.value}" not found`);

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/san/iscsi/services/${svms[0].uuid}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: svmLocator.value };
						}
					} else if (operation === 'start') {
						const svmLocator = this.getNodeParameter('iscsiSvm', i) as { mode: string; value: string };
						const svms = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, { name: svmLocator.value });
						if (svms.length === 0) throw new Error(`SVM "${svmLocator.value}" not found`);

						const response = await ontapApiRequest.call(this, 'PATCH', `/protocols/san/iscsi/services/${svms[0].uuid}`, {
							enabled: true,
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'stop') {
						const svmLocator = this.getNodeParameter('iscsiSvm', i) as { mode: string; value: string };
						const svms = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, { name: svmLocator.value });
						if (svms.length === 0) throw new Error(`SVM "${svmLocator.value}" not found`);

						const response = await ontapApiRequest.call(this, 'PATCH', `/protocols/san/iscsi/services/${svms[0].uuid}`, {
							enabled: false,
						});
						responseData = await handleAsyncResponse.call(this, response);
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
