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

export class NetAppOntapStorage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NetApp ONTAP Storage',
		name: 'netAppOntapStorage',
		icon: 'file:netapp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage NetApp ONTAP volumes, aggregates, snapshots, qtrees, and quotas',
		defaults: {
			name: 'ONTAP Storage',
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
						name: 'Aggregate',
						value: 'aggregate',
						description: 'Manage aggregates',
					},
					{
						name: 'Disk',
						value: 'disk',
						description: 'View disk information',
					},
					{
						name: 'Qtree',
						value: 'qtree',
						description: 'Manage qtrees',
					},
					{
						name: 'Quota',
						value: 'quota',
						description: 'Manage quotas',
					},
					{
						name: 'Snapshot',
						value: 'snapshot',
						description: 'Manage volume snapshots',
					},
					{
						name: 'Volume',
						value: 'volume',
						description: 'Manage volumes',
					},
				],
				default: 'volume',
			},

			// ===================
			// VOLUME OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['volume'],
					},
				},
				options: [
					{
						name: 'Clone',
						value: 'clone',
						description: 'Clone a volume from a snapshot',
						action: 'Clone volume',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new volume',
						action: 'Create volume',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a volume',
						action: 'Delete volume',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get volume details',
						action: 'Get volume',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all volumes',
						action: 'Get many volumes',
					},
					{
						name: 'Mount',
						value: 'mount',
						description: 'Mount a volume to a junction path',
						action: 'Mount volume',
					},
					{
						name: 'Move',
						value: 'move',
						description: 'Move volume to another aggregate',
						action: 'Move volume',
					},
					{
						name: 'Offline',
						value: 'offline',
						description: 'Take a volume offline',
						action: 'Offline volume',
					},
					{
						name: 'Online',
						value: 'online',
						description: 'Bring a volume online',
						action: 'Online volume',
					},
					{
						name: 'Resize',
						value: 'resize',
						description: 'Resize a volume',
						action: 'Resize volume',
					},
					{
						name: 'Unmount',
						value: 'unmount',
						description: 'Unmount a volume',
						action: 'Unmount volume',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update volume settings',
						action: 'Update volume',
					},
				],
				default: 'getMany',
			},

			// Volume Selection
			{
				displayName: 'Volume',
				name: 'volumeId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['get', 'update', 'delete', 'resize', 'mount', 'unmount', 'online', 'offline', 'move', 'clone'],
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
						placeholder: 'vol1',
					},
				],
			},

			// Volume SVM (needed for name lookups)
			{
				displayName: 'SVM',
				name: 'volumeSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['get', 'update', 'delete', 'resize', 'mount', 'unmount', 'online', 'offline', 'move', 'clone'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'svm1',
					},
				],
				description: 'SVM containing the volume (required when selecting by name)',
			},

			// Volume Create Fields
			{
				displayName: 'Volume Name',
				name: 'volumeName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['create'],
					},
				},
				description: 'Name for the new volume',
			},
			{
				displayName: 'SVM',
				name: 'createSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['volume'],
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
				displayName: 'Size',
				name: 'volumeSize',
				type: 'string',
				default: '100GB',
				required: true,
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['create'],
					},
				},
				description: 'Size of the volume (e.g., 100GB, 1TB)',
			},
			{
				displayName: 'Aggregate',
				name: 'volumeAggregate',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['volume'],
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
			},

			// Volume Create Additional Options
			{
				displayName: 'Additional Options',
				name: 'volumeCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Junction Path',
						name: 'junctionPath',
						type: 'string',
						default: '',
						placeholder: '/vol1',
						description: 'Mount path for the volume',
					},
					{
						displayName: 'Security Style',
						name: 'securityStyle',
						type: 'options',
						options: [
							{ name: 'Unix', value: 'unix' },
							{ name: 'NTFS', value: 'ntfs' },
							{ name: 'Mixed', value: 'mixed' },
						],
						default: 'unix',
						description: 'Security style for the volume',
					},
					{
						displayName: 'Export Policy',
						name: 'exportPolicy',
						type: 'string',
						default: 'default',
						description: 'Export policy for NFS access',
					},
					{
						displayName: 'Snapshot Policy',
						name: 'snapshotPolicy',
						type: 'string',
						default: 'default',
						description: 'Snapshot policy name',
					},
					{
						displayName: 'Space Guarantee',
						name: 'spaceGuarantee',
						type: 'options',
						options: [
							{ name: 'Volume', value: 'volume' },
							{ name: 'None (Thin)', value: 'none' },
						],
						default: 'volume',
						description: 'Space guarantee type',
					},
					{
						displayName: 'Snapshot Reserve %',
						name: 'snapshotReserve',
						type: 'number',
						default: 5,
						description: 'Percentage of volume reserved for snapshots',
					},
					{
						displayName: 'Enable Deduplication',
						name: 'deduplication',
						type: 'boolean',
						default: false,
						description: 'Whether to enable deduplication',
					},
					{
						displayName: 'Enable Compression',
						name: 'compression',
						type: 'boolean',
						default: false,
						description: 'Whether to enable compression',
					},
					{
						displayName: 'Volume Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Read-Write', value: 'rw' },
							{ name: 'Data Protection', value: 'dp' },
						],
						default: 'rw',
						description: 'Type of volume',
					},
					{
						displayName: 'Comment',
						name: 'comment',
						type: 'string',
						default: '',
						description: 'Comment or description for the volume',
					},
					{
						displayName: 'QoS Policy',
						name: 'qosPolicy',
						type: 'string',
						default: '',
						description: 'QoS policy group name',
					},
					{
						displayName: 'Tiering Policy',
						name: 'tieringPolicy',
						type: 'options',
						options: [
							{ name: 'None', value: 'none' },
							{ name: 'Snapshot Only', value: 'snapshot_only' },
							{ name: 'Auto', value: 'auto' },
							{ name: 'All', value: 'all' },
						],
						default: 'none',
						description: 'FabricPool tiering policy',
					},
				],
			},

			// Volume Resize
			{
				displayName: 'New Size',
				name: 'newSize',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['resize'],
					},
				},
				description: 'New size for the volume (e.g., 200GB, 2TB)',
			},

			// Volume Mount Path
			{
				displayName: 'Junction Path',
				name: 'junctionPath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['mount'],
					},
				},
				placeholder: '/vol1',
				description: 'Mount path for the volume',
			},

			// Volume Move
			{
				displayName: 'Destination Aggregate',
				name: 'destAggregate',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['move'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'aggr2',
					},
				],
			},

			// Volume Clone Fields
			{
				displayName: 'Clone Name',
				name: 'cloneName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['clone'],
					},
				},
				description: 'Name for the cloned volume',
			},
			{
				displayName: 'Parent Snapshot',
				name: 'parentSnapshot',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['volume'],
						operation: ['clone'],
					},
				},
				description: 'Snapshot to clone from (leave empty for current state)',
			},

			// Volume Update Fields
			{
				displayName: 'Update Fields',
				name: 'volumeUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['volume'],
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
						displayName: 'Snapshot Policy',
						name: 'snapshotPolicy',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Export Policy',
						name: 'exportPolicy',
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
						displayName: 'Enable Autosize',
						name: 'autosizeEnabled',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Autosize Maximum',
						name: 'autosizeMax',
						type: 'string',
						default: '',
						description: 'Maximum autosize (e.g., 500GB)',
					},
				],
			},

			// ===================
			// AGGREGATE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['aggregate'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new aggregate',
						action: 'Create aggregate',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an aggregate',
						action: 'Delete aggregate',
					},
					{
						name: 'Expand',
						value: 'expand',
						description: 'Add disks to an aggregate',
						action: 'Expand aggregate',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get aggregate details',
						action: 'Get aggregate',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all aggregates',
						action: 'Get many aggregates',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update aggregate settings',
						action: 'Update aggregate',
					},
				],
				default: 'getMany',
			},

			// Aggregate Selection
			{
				displayName: 'Aggregate',
				name: 'aggregateId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['aggregate'],
						operation: ['get', 'update', 'delete', 'expand'],
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

			// Aggregate Create Fields
			{
				displayName: 'Aggregate Name',
				name: 'aggregateName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['aggregate'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Node',
				name: 'aggregateNode',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['aggregate'],
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
				displayName: 'Disk Count',
				name: 'diskCount',
				type: 'number',
				default: 4,
				required: true,
				displayOptions: {
					show: {
						resource: ['aggregate'],
						operation: ['create'],
					},
				},
				description: 'Number of disks to include',
			},
			{
				displayName: 'RAID Type',
				name: 'raidType',
				type: 'options',
				options: [
					{ name: 'RAID-DP', value: 'raid_dp' },
					{ name: 'RAID-TEC', value: 'raid_tec' },
					{ name: 'RAID4', value: 'raid4' },
				],
				default: 'raid_dp',
				displayOptions: {
					show: {
						resource: ['aggregate'],
						operation: ['create'],
					},
				},
			},

			// Aggregate Expand
			{
				displayName: 'Disks to Add',
				name: 'expandDiskCount',
				type: 'number',
				default: 1,
				required: true,
				displayOptions: {
					show: {
						resource: ['aggregate'],
						operation: ['expand'],
					},
				},
				description: 'Number of disks to add to the aggregate',
			},

			// ===================
			// SNAPSHOT OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['snapshot'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new snapshot',
						action: 'Create snapshot',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a snapshot',
						action: 'Delete snapshot',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get snapshot details',
						action: 'Get snapshot',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all snapshots for a volume',
						action: 'Get many snapshots',
					},
					{
						name: 'Restore',
						value: 'restore',
						description: 'Restore volume from snapshot',
						action: 'Restore from snapshot',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update snapshot properties',
						action: 'Update snapshot',
					},
				],
				default: 'getMany',
			},

			// Snapshot Volume
			{
				displayName: 'Volume',
				name: 'snapshotVolume',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['snapshot'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// Snapshot for operations requiring it
			{
				displayName: 'Snapshot',
				name: 'snapshotId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['snapshot'],
						operation: ['get', 'delete', 'update', 'restore'],
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

			// Snapshot Create Fields
			{
				displayName: 'Snapshot Name',
				name: 'snapshotName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['snapshot'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Comment',
				name: 'snapshotComment',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['snapshot'],
						operation: ['create', 'update'],
					},
				},
			},
			{
				displayName: 'Expiry Time',
				name: 'snapshotExpiry',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						resource: ['snapshot'],
						operation: ['create', 'update'],
					},
				},
				description: 'Time when the snapshot should be automatically deleted',
			},
			{
				displayName: 'SnapLock Expiry Time',
				name: 'snapshotSnapLockExpiry',
				type: 'dateTime',
				default: '',
				displayOptions: {
					show: {
						resource: ['snapshot'],
						operation: ['create', 'update'],
					},
				},
				description: 'SnapLock expiry time (for SnapLock volumes)',
			},

			// ===================
			// QTREE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['qtree'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new qtree',
						action: 'Create qtree',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a qtree',
						action: 'Delete qtree',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get qtree details',
						action: 'Get qtree',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all qtrees',
						action: 'Get many qtrees',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update qtree settings',
						action: 'Update qtree',
					},
				],
				default: 'getMany',
			},

			// Qtree Volume
			{
				displayName: 'Volume',
				name: 'qtreeVolume',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['qtree'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// Qtree ID (for get, update, delete)
			{
				displayName: 'Qtree ID',
				name: 'qtreeId',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						resource: ['qtree'],
						operation: ['get', 'update', 'delete'],
					},
				},
				description: 'Qtree ID number',
			},

			// Qtree Create Fields
			{
				displayName: 'Qtree Name',
				name: 'qtreeName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['qtree'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Security Style',
				name: 'qtreeSecurityStyle',
				type: 'options',
				options: [
					{ name: 'Unix', value: 'unix' },
					{ name: 'NTFS', value: 'ntfs' },
					{ name: 'Mixed', value: 'mixed' },
				],
				default: 'unix',
				displayOptions: {
					show: {
						resource: ['qtree'],
						operation: ['create', 'update'],
					},
				},
			},
			{
				displayName: 'Export Policy',
				name: 'qtreeExportPolicy',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['qtree'],
						operation: ['create', 'update'],
					},
				},
			},
			{
				displayName: 'Unix Permissions',
				name: 'qtreeUnixPermissions',
				type: 'number',
				default: 755,
				displayOptions: {
					show: {
						resource: ['qtree'],
						operation: ['create', 'update'],
					},
				},
				description: 'Unix permissions (e.g., 755)',
			},

			// ===================
			// QUOTA OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['quota'],
					},
				},
				options: [
					{
						name: 'Create Rule',
						value: 'create',
						description: 'Create a new quota rule',
						action: 'Create quota rule',
					},
					{
						name: 'Delete Rule',
						value: 'delete',
						description: 'Delete a quota rule',
						action: 'Delete quota rule',
					},
					{
						name: 'Get Many Rules',
						value: 'getMany',
						description: 'Get all quota rules',
						action: 'Get many quota rules',
					},
					{
						name: 'Get Report',
						value: 'getReport',
						description: 'Get quota usage report',
						action: 'Get quota report',
					},
					{
						name: 'Update Rule',
						value: 'update',
						description: 'Update a quota rule',
						action: 'Update quota rule',
					},
				],
				default: 'getMany',
			},

			// Quota Volume
			{
				displayName: 'Volume',
				name: 'quotaVolume',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['quota'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// Quota Rule UUID
			{
				displayName: 'Quota Rule UUID',
				name: 'quotaRuleUuid',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['quota'],
						operation: ['delete', 'update'],
					},
				},
			},

			// Quota Rule Create Fields
			{
				displayName: 'Quota Type',
				name: 'quotaType',
				type: 'options',
				options: [
					{ name: 'User', value: 'user' },
					{ name: 'Group', value: 'group' },
					{ name: 'Tree', value: 'tree' },
				],
				default: 'tree',
				required: true,
				displayOptions: {
					show: {
						resource: ['quota'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Space Hard Limit',
				name: 'quotaSpaceLimit',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['quota'],
						operation: ['create', 'update'],
					},
				},
				placeholder: '10GB',
				description: 'Hard limit for space usage',
			},
			{
				displayName: 'Space Soft Limit',
				name: 'quotaSpaceSoftLimit',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['quota'],
						operation: ['create', 'update'],
					},
				},
				placeholder: '8GB',
				description: 'Soft limit for space usage (triggers alerts)',
			},
			{
				displayName: 'Files Hard Limit',
				name: 'quotaFilesLimit',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						resource: ['quota'],
						operation: ['create', 'update'],
					},
				},
				description: 'Hard limit for number of files (0 = unlimited)',
			},

			// ===================
			// DISK OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['disk'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get disk details',
						action: 'Get disk',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all disks',
						action: 'Get many disks',
					},
				],
				default: 'getMany',
			},

			// Disk Name
			{
				displayName: 'Disk Name',
				name: 'diskName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['disk'],
						operation: ['get'],
					},
				},
				placeholder: '1.0.1',
				description: 'Disk name (e.g., 1.0.1)',
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

				// Helper to resolve volume by name
				const resolveVolumeId = async (locator: { mode: string; value: string }, svmName?: string): Promise<string> => {
					if (locator.mode === 'uuid') {
						return locator.value;
					}
					const queryParams: IDataObject = { name: locator.value };
					if (svmName) queryParams['svm.name'] = svmName;
					const volumes = await ontapApiRequestAllItems.call(this, 'GET', '/storage/volumes', {}, queryParams);
					if (volumes.length === 0) {
						throw new Error(`Volume "${locator.value}" not found`);
					}
					return volumes[0].uuid as string;
				};

				// Helper to resolve aggregate
				const resolveAggregateId = async (locator: { mode: string; value: string }): Promise<string> => {
					if (locator.mode === 'uuid') {
						return locator.value;
					}
					const aggregates = await ontapApiRequestAllItems.call(this, 'GET', '/storage/aggregates', {}, { name: locator.value });
					if (aggregates.length === 0) {
						throw new Error(`Aggregate "${locator.value}" not found`);
					}
					return aggregates[0].uuid as string;
				};

				// ========== VOLUME ==========
				if (resource === 'volume') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/storage/volumes', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/storage/volumes', {}, qs);
						}
					} else if (operation === 'get') {
						const volumeLocator = this.getNodeParameter('volumeId', i) as { mode: string; value: string };
						const svmLocator = this.getNodeParameter('volumeSvm', i, null) as { mode: string; value: string } | null;
						const volumeId = await resolveVolumeId(volumeLocator, svmLocator?.value);
						responseData = await ontapApiRequest.call(this, 'GET', `/storage/volumes/${volumeId}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('volumeName', i) as string;
						const svmLocator = this.getNodeParameter('createSvm', i) as { mode: string; value: string };
						const size = this.getNodeParameter('volumeSize', i) as string;
						const aggrLocator = this.getNodeParameter('volumeAggregate', i) as { mode: string; value: string };
						const createOptions = this.getNodeParameter('volumeCreateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							name,
							svm: { name: svmLocator.value },
							size: parseSize(size),
							aggregates: [{ name: aggrLocator.value }],
						};

						if (createOptions.junctionPath) {
							body.nas = body.nas || {};
							(body.nas as IDataObject).path = createOptions.junctionPath;
						}
						if (createOptions.securityStyle) {
							body.nas = body.nas || {};
							(body.nas as IDataObject).security_style = createOptions.securityStyle;
						}
						if (createOptions.exportPolicy) {
							body.nas = body.nas || {};
							(body.nas as IDataObject).export_policy = { name: createOptions.exportPolicy };
						}
						if (createOptions.snapshotPolicy) {
							body.snapshot_policy = { name: createOptions.snapshotPolicy };
						}
						if (createOptions.spaceGuarantee) {
							body.guarantee = { type: createOptions.spaceGuarantee };
						}
						if (createOptions.snapshotReserve !== undefined) {
							body.space = body.space || {};
							(body.space as IDataObject).snapshot = { reserve_percent: createOptions.snapshotReserve };
						}
						if (createOptions.type) {
							body.type = createOptions.type;
						}
						if (createOptions.comment) {
							body.comment = createOptions.comment;
						}
						if (createOptions.qosPolicy) {
							body.qos = { policy: { name: createOptions.qosPolicy } };
						}
						if (createOptions.tieringPolicy) {
							body.tiering = { policy: createOptions.tieringPolicy };
						}
						if (createOptions.deduplication || createOptions.compression) {
							body.efficiency = {
								dedupe: createOptions.deduplication ? 'background' : 'none',
								compression: createOptions.compression ? 'background' : 'none',
							};
						}

						const response = await ontapApiRequest.call(this, 'POST', '/storage/volumes', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const volumeLocator = this.getNodeParameter('volumeId', i) as { mode: string; value: string };
						const svmLocator = this.getNodeParameter('volumeSvm', i, null) as { mode: string; value: string } | null;
						const volumeId = await resolveVolumeId(volumeLocator, svmLocator?.value);
						const updateFields = this.getNodeParameter('volumeUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.comment) body.comment = updateFields.comment;
						if (updateFields.snapshotPolicy) body.snapshot_policy = { name: updateFields.snapshotPolicy };
						if (updateFields.exportPolicy) {
							body.nas = { export_policy: { name: updateFields.exportPolicy } };
						}
						if (updateFields.qosPolicy) {
							body.qos = { policy: { name: updateFields.qosPolicy } };
						}
						if (updateFields.autosizeEnabled !== undefined || updateFields.autosizeMax) {
							body.autosize = {
								mode: updateFields.autosizeEnabled ? 'grow' : 'off',
							};
							if (updateFields.autosizeMax) {
								(body.autosize as IDataObject).maximum = parseSize(updateFields.autosizeMax as string);
							}
						}

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/volumes/${volumeId}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const volumeLocator = this.getNodeParameter('volumeId', i) as { mode: string; value: string };
						const svmLocator = this.getNodeParameter('volumeSvm', i, null) as { mode: string; value: string } | null;
						const volumeId = await resolveVolumeId(volumeLocator, svmLocator?.value);

						const response = await ontapApiRequest.call(this, 'DELETE', `/storage/volumes/${volumeId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: volumeId };
						}
					} else if (operation === 'resize') {
						const volumeLocator = this.getNodeParameter('volumeId', i) as { mode: string; value: string };
						const svmLocator = this.getNodeParameter('volumeSvm', i, null) as { mode: string; value: string } | null;
						const volumeId = await resolveVolumeId(volumeLocator, svmLocator?.value);
						const newSize = this.getNodeParameter('newSize', i) as string;

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/volumes/${volumeId}`, {
							size: parseSize(newSize),
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'mount') {
						const volumeLocator = this.getNodeParameter('volumeId', i) as { mode: string; value: string };
						const svmLocator = this.getNodeParameter('volumeSvm', i, null) as { mode: string; value: string } | null;
						const volumeId = await resolveVolumeId(volumeLocator, svmLocator?.value);
						const junctionPath = this.getNodeParameter('junctionPath', i) as string;

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/volumes/${volumeId}`, {
							nas: { path: junctionPath },
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'unmount') {
						const volumeLocator = this.getNodeParameter('volumeId', i) as { mode: string; value: string };
						const svmLocator = this.getNodeParameter('volumeSvm', i, null) as { mode: string; value: string } | null;
						const volumeId = await resolveVolumeId(volumeLocator, svmLocator?.value);

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/volumes/${volumeId}`, {
							nas: { path: '' },
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'online') {
						const volumeLocator = this.getNodeParameter('volumeId', i) as { mode: string; value: string };
						const svmLocator = this.getNodeParameter('volumeSvm', i, null) as { mode: string; value: string } | null;
						const volumeId = await resolveVolumeId(volumeLocator, svmLocator?.value);

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/volumes/${volumeId}`, {
							state: 'online',
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'offline') {
						const volumeLocator = this.getNodeParameter('volumeId', i) as { mode: string; value: string };
						const svmLocator = this.getNodeParameter('volumeSvm', i, null) as { mode: string; value: string } | null;
						const volumeId = await resolveVolumeId(volumeLocator, svmLocator?.value);

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/volumes/${volumeId}`, {
							state: 'offline',
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'move') {
						const volumeLocator = this.getNodeParameter('volumeId', i) as { mode: string; value: string };
						const svmLocator = this.getNodeParameter('volumeSvm', i, null) as { mode: string; value: string } | null;
						const volumeId = await resolveVolumeId(volumeLocator, svmLocator?.value);
						const destAggr = this.getNodeParameter('destAggregate', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/volumes/${volumeId}`, {
							movement: {
								destination_aggregate: { name: destAggr.value },
							},
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'clone') {
						const volumeLocator = this.getNodeParameter('volumeId', i) as { mode: string; value: string };
						const svmLocator = this.getNodeParameter('volumeSvm', i, null) as { mode: string; value: string } | null;
						const volumeId = await resolveVolumeId(volumeLocator, svmLocator?.value);
						const cloneName = this.getNodeParameter('cloneName', i) as string;
						const parentSnapshot = this.getNodeParameter('parentSnapshot', i, '') as string;

						// Get parent volume info for SVM
						const parentVol = await ontapApiRequest.call(this, 'GET', `/storage/volumes/${volumeId}`, {}, { fields: 'svm.name' }) as IDataObject;

						const body: IDataObject = {
							name: cloneName,
							svm: { name: (parentVol.svm as IDataObject)?.name },
							clone: {
								parent_volume: { uuid: volumeId },
								is_flexclone: true,
							},
						};

						if (parentSnapshot) {
							(body.clone as IDataObject).parent_snapshot = { name: parentSnapshot };
						}

						const response = await ontapApiRequest.call(this, 'POST', '/storage/volumes', body);
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== AGGREGATE ==========
				else if (resource === 'aggregate') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/storage/aggregates', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/storage/aggregates', {}, qs);
						}
					} else if (operation === 'get') {
						const aggrLocator = this.getNodeParameter('aggregateId', i) as { mode: string; value: string };
						const aggrId = await resolveAggregateId(aggrLocator);
						responseData = await ontapApiRequest.call(this, 'GET', `/storage/aggregates/${aggrId}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('aggregateName', i) as string;
						const nodeLocator = this.getNodeParameter('aggregateNode', i) as { mode: string; value: string };
						const diskCount = this.getNodeParameter('diskCount', i) as number;
						const raidType = this.getNodeParameter('raidType', i) as string;

						const body: IDataObject = {
							name,
							node: { name: nodeLocator.value },
							block_storage: {
								primary: {
									disk_count: diskCount,
									raid_type: raidType,
								},
							},
						};

						const response = await ontapApiRequest.call(this, 'POST', '/storage/aggregates', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const aggrLocator = this.getNodeParameter('aggregateId', i) as { mode: string; value: string };
						const aggrId = await resolveAggregateId(aggrLocator);

						const response = await ontapApiRequest.call(this, 'DELETE', `/storage/aggregates/${aggrId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: aggrId };
						}
					} else if (operation === 'expand') {
						const aggrLocator = this.getNodeParameter('aggregateId', i) as { mode: string; value: string };
						const aggrId = await resolveAggregateId(aggrLocator);
						const diskCount = this.getNodeParameter('expandDiskCount', i) as number;

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/aggregates/${aggrId}`, {
							block_storage: {
								primary: {
									disk_count: diskCount,
								},
							},
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const aggrLocator = this.getNodeParameter('aggregateId', i) as { mode: string; value: string };
						const aggrId = await resolveAggregateId(aggrLocator);
						// Placeholder - aggregates have limited update options
						responseData = await ontapApiRequest.call(this, 'GET', `/storage/aggregates/${aggrId}`, {}, qs);
					}
				}

				// ========== SNAPSHOT ==========
				else if (resource === 'snapshot') {
					const volumeLocator = this.getNodeParameter('snapshotVolume', i) as { mode: string; value: string };
					const volumeId = volumeLocator.value;

					if (operation === 'getMany') {
						responseData = await ontapApiRequestAllItems.call(this, 'GET', `/storage/volumes/${volumeId}/snapshots`, {}, qs);
					} else if (operation === 'get') {
						const snapLocator = this.getNodeParameter('snapshotId', i) as { mode: string; value: string };
						let snapId = snapLocator.value;
						
						if (snapLocator.mode === 'name') {
							const snaps = await ontapApiRequestAllItems.call(
								this,
								'GET',
								`/storage/volumes/${volumeId}/snapshots`,
								{},
								{ name: snapId },
							);
							if (snaps.length === 0) throw new Error(`Snapshot "${snapId}" not found`);
							snapId = snaps[0].uuid as string;
						}
						
						responseData = await ontapApiRequest.call(this, 'GET', `/storage/volumes/${volumeId}/snapshots/${snapId}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('snapshotName', i) as string;
						const comment = this.getNodeParameter('snapshotComment', i, '') as string;
						const expiry = this.getNodeParameter('snapshotExpiry', i, '') as string;
						const snapLockExpiry = this.getNodeParameter('snapshotSnapLockExpiry', i, '') as string;

						const body: IDataObject = { name };
						if (comment) body.comment = comment;
						if (expiry) body.expiry_time = expiry;
						if (snapLockExpiry) body.snaplock_expiry_time = snapLockExpiry;

						const response = await ontapApiRequest.call(this, 'POST', `/storage/volumes/${volumeId}/snapshots`, body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const snapLocator = this.getNodeParameter('snapshotId', i) as { mode: string; value: string };
						let snapId = snapLocator.value;
						
						if (snapLocator.mode === 'name') {
							const snaps = await ontapApiRequestAllItems.call(
								this,
								'GET',
								`/storage/volumes/${volumeId}/snapshots`,
								{},
								{ name: snapId },
							);
							if (snaps.length === 0) throw new Error(`Snapshot "${snapId}" not found`);
							snapId = snaps[0].uuid as string;
						}

						const response = await ontapApiRequest.call(this, 'DELETE', `/storage/volumes/${volumeId}/snapshots/${snapId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: snapId };
						}
					} else if (operation === 'update') {
						const snapLocator = this.getNodeParameter('snapshotId', i) as { mode: string; value: string };
						let snapId = snapLocator.value;
						
						if (snapLocator.mode === 'name') {
							const snaps = await ontapApiRequestAllItems.call(
								this,
								'GET',
								`/storage/volumes/${volumeId}/snapshots`,
								{},
								{ name: snapId },
							);
							if (snaps.length === 0) throw new Error(`Snapshot "${snapId}" not found`);
							snapId = snaps[0].uuid as string;
						}

						const comment = this.getNodeParameter('snapshotComment', i, '') as string;
						const expiry = this.getNodeParameter('snapshotExpiry', i, '') as string;
						const snapLockExpiry = this.getNodeParameter('snapshotSnapLockExpiry', i, '') as string;

						const body: IDataObject = {};
						if (comment) body.comment = comment;
						if (expiry) body.expiry_time = expiry;
						if (snapLockExpiry) body.snaplock_expiry_time = snapLockExpiry;

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/volumes/${volumeId}/snapshots/${snapId}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'restore') {
						const snapLocator = this.getNodeParameter('snapshotId', i) as { mode: string; value: string };
						let snapId = snapLocator.value;
						
						if (snapLocator.mode === 'name') {
							const snaps = await ontapApiRequestAllItems.call(
								this,
								'GET',
								`/storage/volumes/${volumeId}/snapshots`,
								{},
								{ name: snapId },
							);
							if (snaps.length === 0) throw new Error(`Snapshot "${snapId}" not found`);
							snapId = snaps[0].uuid as string;
						}

						// Restore by setting restore_to on volume
						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/volumes/${volumeId}`, {
							restore_to: { snapshot: { uuid: snapId } },
						});
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== QTREE ==========
				else if (resource === 'qtree') {
					const volumeLocator = this.getNodeParameter('qtreeVolume', i) as { mode: string; value: string };
					const volumeId = volumeLocator.value;

					if (operation === 'getMany') {
						responseData = await ontapApiRequestAllItems.call(this, 'GET', `/storage/volumes/${volumeId}/qtrees`, {}, qs);
					} else if (operation === 'get') {
						const qtreeId = this.getNodeParameter('qtreeId', i) as number;
						responseData = await ontapApiRequest.call(this, 'GET', `/storage/volumes/${volumeId}/qtrees/${qtreeId}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('qtreeName', i) as string;
						const securityStyle = this.getNodeParameter('qtreeSecurityStyle', i) as string;
						const exportPolicy = this.getNodeParameter('qtreeExportPolicy', i, '') as string;
						const unixPermissions = this.getNodeParameter('qtreeUnixPermissions', i) as number;

						const body: IDataObject = {
							name,
							security_style: securityStyle,
							unix_permissions: unixPermissions,
						};
						if (exportPolicy) {
							body.export_policy = { name: exportPolicy };
						}

						const response = await ontapApiRequest.call(this, 'POST', `/storage/volumes/${volumeId}/qtrees`, body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const qtreeId = this.getNodeParameter('qtreeId', i) as number;
						const securityStyle = this.getNodeParameter('qtreeSecurityStyle', i, '') as string;
						const exportPolicy = this.getNodeParameter('qtreeExportPolicy', i, '') as string;
						const unixPermissions = this.getNodeParameter('qtreeUnixPermissions', i, 0) as number;

						const body: IDataObject = {};
						if (securityStyle) body.security_style = securityStyle;
						if (exportPolicy) body.export_policy = { name: exportPolicy };
						if (unixPermissions) body.unix_permissions = unixPermissions;

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/volumes/${volumeId}/qtrees/${qtreeId}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const qtreeId = this.getNodeParameter('qtreeId', i) as number;

						const response = await ontapApiRequest.call(this, 'DELETE', `/storage/volumes/${volumeId}/qtrees/${qtreeId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: qtreeId };
						}
					}
				}

				// ========== QUOTA ==========
				else if (resource === 'quota') {
					const volumeLocator = this.getNodeParameter('quotaVolume', i) as { mode: string; value: string };
					const volumeId = volumeLocator.value;

					if (operation === 'getMany') {
						responseData = await ontapApiRequestAllItems.call(this, 'GET', '/storage/quota/rules', {}, { ...qs, 'volume.uuid': volumeId });
					} else if (operation === 'getReport') {
						responseData = await ontapApiRequestAllItems.call(this, 'GET', '/storage/quota/reports', {}, { ...qs, 'volume.uuid': volumeId });
					} else if (operation === 'create') {
						const quotaType = this.getNodeParameter('quotaType', i) as string;
						const spaceLimit = this.getNodeParameter('quotaSpaceLimit', i, '') as string;
						const spaceSoftLimit = this.getNodeParameter('quotaSpaceSoftLimit', i, '') as string;
						const filesLimit = this.getNodeParameter('quotaFilesLimit', i, 0) as number;

						const body: IDataObject = {
							volume: { uuid: volumeId },
							type: quotaType,
						};

						const space: IDataObject = {};
						if (spaceLimit) space.hard_limit = parseSize(spaceLimit);
						if (spaceSoftLimit) space.soft_limit = parseSize(spaceSoftLimit);
						if (Object.keys(space).length > 0) body.space = space;

						if (filesLimit > 0) {
							body.files = { hard_limit: filesLimit };
						}

						const response = await ontapApiRequest.call(this, 'POST', '/storage/quota/rules', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const ruleUuid = this.getNodeParameter('quotaRuleUuid', i) as string;
						const spaceLimit = this.getNodeParameter('quotaSpaceLimit', i, '') as string;
						const spaceSoftLimit = this.getNodeParameter('quotaSpaceSoftLimit', i, '') as string;
						const filesLimit = this.getNodeParameter('quotaFilesLimit', i, 0) as number;

						const body: IDataObject = {};
						const space: IDataObject = {};
						if (spaceLimit) space.hard_limit = parseSize(spaceLimit);
						if (spaceSoftLimit) space.soft_limit = parseSize(spaceSoftLimit);
						if (Object.keys(space).length > 0) body.space = space;
						if (filesLimit > 0) body.files = { hard_limit: filesLimit };

						const response = await ontapApiRequest.call(this, 'PATCH', `/storage/quota/rules/${ruleUuid}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const ruleUuid = this.getNodeParameter('quotaRuleUuid', i) as string;

						const response = await ontapApiRequest.call(this, 'DELETE', `/storage/quota/rules/${ruleUuid}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: ruleUuid };
						}
					}
				}

				// ========== DISK ==========
				else if (resource === 'disk') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/storage/disks', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/storage/disks', {}, qs);
						}
					} else if (operation === 'get') {
						const diskName = this.getNodeParameter('diskName', i) as string;
						responseData = await ontapApiRequest.call(this, 'GET', `/storage/disks/${diskName}`, {}, qs);
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
