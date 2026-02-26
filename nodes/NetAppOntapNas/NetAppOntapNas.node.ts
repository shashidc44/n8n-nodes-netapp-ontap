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

export class NetAppOntapNas implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NetApp ONTAP NAS',
		name: 'netAppOntapNas',
		icon: 'file:netapp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage NetApp ONTAP CIFS shares, NFS exports, and NAS protocols',
		defaults: {
			name: 'ONTAP NAS',
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
						name: 'CIFS Service',
						value: 'cifsService',
						description: 'Manage CIFS/SMB services',
					},
					{
						name: 'CIFS Share',
						value: 'cifsShare',
						description: 'Manage CIFS/SMB shares',
					},
					{
						name: 'CIFS Session',
						value: 'cifsSession',
						description: 'View and manage CIFS sessions',
					},
					{
						name: 'NFS Service',
						value: 'nfsService',
						description: 'Manage NFS services',
					},
					{
						name: 'NFS Export Policy',
						value: 'exportPolicy',
						description: 'Manage NFS export policies',
					},
					{
						name: 'NFS Export Rule',
						value: 'exportRule',
						description: 'Manage NFS export policy rules',
					},
				],
				default: 'cifsShare',
			},

			// ===================
			// CIFS SHARE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['cifsShare'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new CIFS share',
						action: 'Create CIFS share',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a CIFS share',
						action: 'Delete CIFS share',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get CIFS share details',
						action: 'Get CIFS share',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all CIFS shares',
						action: 'Get many CIFS shares',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update CIFS share properties',
						action: 'Update CIFS share',
					},
				],
				default: 'getMany',
			},

			// CIFS Share Selection
			{
				displayName: 'SVM',
				name: 'shareSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsShare'],
						operation: ['get', 'update', 'delete'],
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
				displayName: 'Share Name',
				name: 'shareName',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsShare'],
						operation: ['get', 'update', 'delete'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},

			// CIFS Share Create Fields
			{
				displayName: 'Share Name',
				name: 'newShareName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsShare'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'SVM',
				name: 'newShareSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsShare'],
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
				displayName: 'Path',
				name: 'sharePath',
				type: 'string',
				default: '/',
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsShare'],
						operation: ['create'],
					},
				},
				placeholder: '/vol1/share1',
				description: 'The path to be shared',
			},

			// CIFS Share Options
			{
				displayName: 'Additional Options',
				name: 'shareCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['cifsShare'],
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
						displayName: 'Continuously Available',
						name: 'continuouslyAvailable',
						type: 'boolean',
						default: false,
						description: 'Whether the share should be continuously available',
					},
					{
						displayName: 'Encryption Required',
						name: 'encryptionRequired',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Namespace Caching',
						name: 'namespaceCaching',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Offline Files',
						name: 'offlineFiles',
						type: 'options',
						options: [
							{ name: 'Documents', value: 'documents' },
							{ name: 'Manual', value: 'manual' },
							{ name: 'None', value: 'none' },
							{ name: 'Programs', value: 'programs' },
						],
						default: 'manual',
					},
					{
						displayName: 'Oplocks',
						name: 'oplocks',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Unix Symlink',
						name: 'unixSymlink',
						type: 'options',
						options: [
							{ name: 'Disable', value: 'disable' },
							{ name: 'Hide', value: 'hide' },
							{ name: 'Local', value: 'local' },
							{ name: 'Read Only', value: 'read_only' },
							{ name: 'Symlinks', value: 'symlinks' },
							{ name: 'Symlinks and Widelinks', value: 'symlinks_and_widelinks' },
						],
						default: 'local',
					},
				],
			},

			// CIFS Share Update Fields
			{
				displayName: 'Update Fields',
				name: 'shareUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['cifsShare'],
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
						displayName: 'Continuously Available',
						name: 'continuouslyAvailable',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Encryption Required',
						name: 'encryptionRequired',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Oplocks',
						name: 'oplocks',
						type: 'boolean',
						default: true,
					},
				],
			},

			// ===================
			// CIFS SERVICE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['cifsService'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create CIFS service for an SVM',
						action: 'Create CIFS service',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete CIFS service',
						action: 'Delete CIFS service',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get CIFS service details',
						action: 'Get CIFS service',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all CIFS services',
						action: 'Get many CIFS services',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update CIFS service',
						action: 'Update CIFS service',
					},
				],
				default: 'getMany',
			},

			// CIFS Service SVM
			{
				displayName: 'SVM',
				name: 'cifsSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsService'],
						operation: ['create', 'get', 'delete', 'update'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},

			// CIFS Service Create Fields
			{
				displayName: 'NetBIOS Name',
				name: 'cifsName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsService'],
						operation: ['create'],
					},
				},
				description: 'NetBIOS name for the CIFS server',
			},
			{
				displayName: 'AD Domain',
				name: 'cifsDomain',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsService'],
						operation: ['create'],
					},
				},
				placeholder: 'example.com',
				description: 'Active Directory domain to join',
			},
			{
				displayName: 'AD Username',
				name: 'cifsAdUser',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsService'],
						operation: ['create'],
					},
				},
				description: 'AD user with permissions to join domain',
			},
			{
				displayName: 'AD Password',
				name: 'cifsAdPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsService'],
						operation: ['create'],
					},
				},
			},

			// CIFS Service Create Options
			{
				displayName: 'Additional Options',
				name: 'cifsCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['cifsService'],
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
						displayName: 'Default Unix User',
						name: 'defaultUnixUser',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Organizational Unit',
						name: 'ou',
						type: 'string',
						default: '',
						placeholder: 'OU=Servers,DC=example,DC=com',
					},
				],
			},

			// CIFS Service Update Fields
			{
				displayName: 'Update Fields',
				name: 'cifsUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['cifsService'],
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
						displayName: 'Default Unix User',
						name: 'defaultUnixUser',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Enabled',
						name: 'enabled',
						type: 'boolean',
						default: true,
					},
				],
			},

			// ===================
			// CIFS SESSION OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['cifsSession'],
					},
				},
				options: [
					{
						name: 'Delete',
						value: 'delete',
						description: 'Disconnect a CIFS session',
						action: 'Delete CIFS session',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all CIFS sessions',
						action: 'Get many CIFS sessions',
					},
				],
				default: 'getMany',
			},

			// CIFS Session Delete
			{
				displayName: 'SVM',
				name: 'sessionSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsSession'],
						operation: ['delete'],
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
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsSession'],
						operation: ['delete'],
					},
				},
			},
			{
				displayName: 'Connection ID',
				name: 'connectionId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['cifsSession'],
						operation: ['delete'],
					},
				},
			},

			// ===================
			// NFS SERVICE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['nfsService'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create NFS service for an SVM',
						action: 'Create NFS service',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete NFS service',
						action: 'Delete NFS service',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get NFS service details',
						action: 'Get NFS service',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all NFS services',
						action: 'Get many NFS services',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update NFS service',
						action: 'Update NFS service',
					},
				],
				default: 'getMany',
			},

			// NFS Service SVM
			{
				displayName: 'SVM',
				name: 'nfsSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['nfsService'],
						operation: ['create', 'get', 'delete', 'update'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},

			// NFS Service Create Options
			{
				displayName: 'Protocol Options',
				name: 'nfsCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['nfsService'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'NFSv3 Enabled',
						name: 'nfsv3Enabled',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'NFSv4 Enabled',
						name: 'nfsv4Enabled',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'NFSv4.1 Enabled',
						name: 'nfsv41Enabled',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Showmount Enabled',
						name: 'showmountEnabled',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'VStorage Enabled',
						name: 'vstorageEnabled',
						type: 'boolean',
						default: false,
					},
				],
			},

			// NFS Service Update Fields
			{
				displayName: 'Update Fields',
				name: 'nfsUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['nfsService'],
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
					{
						displayName: 'NFSv3 Enabled',
						name: 'nfsv3Enabled',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'NFSv4 Enabled',
						name: 'nfsv4Enabled',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'NFSv4.1 Enabled',
						name: 'nfsv41Enabled',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Showmount Enabled',
						name: 'showmountEnabled',
						type: 'boolean',
						default: true,
					},
				],
			},

			// ===================
			// EXPORT POLICY OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['exportPolicy'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new export policy',
						action: 'Create export policy',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an export policy',
						action: 'Delete export policy',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get export policy details',
						action: 'Get export policy',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all export policies',
						action: 'Get many export policies',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update export policy name',
						action: 'Update export policy',
					},
				],
				default: 'getMany',
			},

			// Export Policy Selection
			{
				displayName: 'Export Policy',
				name: 'exportPolicyId',
				type: 'resourceLocator',
				default: { mode: 'id', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['exportPolicy'],
						operation: ['get', 'update', 'delete'],
					},
				},
				modes: [					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
					},
				],
			},

			// Export Policy Create
			{
				displayName: 'Policy Name',
				name: 'exportPolicyName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['exportPolicy'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'SVM',
				name: 'exportPolicySvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['exportPolicy'],
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

			// Export Policy Update
			{
				displayName: 'New Name',
				name: 'exportPolicyNewName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['exportPolicy'],
						operation: ['update'],
					},
				},
			},

			// ===================
			// EXPORT RULE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['exportRule'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new export rule',
						action: 'Create export rule',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an export rule',
						action: 'Delete export rule',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get export rule details',
						action: 'Get export rule',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all export rules for a policy',
						action: 'Get many export rules',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update export rule',
						action: 'Update export rule',
					},
				],
				default: 'getMany',
			},

			// Export Rule Policy Selection
			{
				displayName: 'Export Policy',
				name: 'ruleExportPolicy',
				type: 'resourceLocator',
				default: { mode: 'id', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['exportRule'],
					},
				},
				modes: [					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
					},
				],
			},

			// Export Rule Index
			{
				displayName: 'Rule Index',
				name: 'ruleIndex',
				type: 'number',
				default: 1,
				required: true,
				displayOptions: {
					show: {
						resource: ['exportRule'],
						operation: ['get', 'update', 'delete'],
					},
				},
			},

			// Export Rule Create Fields
			{
				displayName: 'Clients',
				name: 'ruleClients',
				type: 'string',
				default: '0.0.0.0/0',
				required: true,
				displayOptions: {
					show: {
						resource: ['exportRule'],
						operation: ['create'],
					},
				},
				placeholder: '0.0.0.0/0 or 192.168.1.0/24',
				description: 'Client match specification (IP, subnet, or hostname)',
			},
			{
				displayName: 'RO Rule',
				name: 'ruleRoRule',
				type: 'multiOptions',
				options: [
					{ name: 'Any', value: 'any' },
					{ name: 'Krb5', value: 'krb5' },
					{ name: 'Krb5i', value: 'krb5i' },
					{ name: 'Krb5p', value: 'krb5p' },
					{ name: 'Never', value: 'never' },
					{ name: 'None', value: 'none' },
					{ name: 'NTLM', value: 'ntlm' },
					{ name: 'Sys', value: 'sys' },
				],
				default: ['sys'],
				required: true,
				displayOptions: {
					show: {
						resource: ['exportRule'],
						operation: ['create'],
					},
				},
				description: 'Read-only access security flavors',
			},
			{
				displayName: 'RW Rule',
				name: 'ruleRwRule',
				type: 'multiOptions',
				options: [
					{ name: 'Any', value: 'any' },
					{ name: 'Krb5', value: 'krb5' },
					{ name: 'Krb5i', value: 'krb5i' },
					{ name: 'Krb5p', value: 'krb5p' },
					{ name: 'Never', value: 'never' },
					{ name: 'None', value: 'none' },
					{ name: 'NTLM', value: 'ntlm' },
					{ name: 'Sys', value: 'sys' },
				],
				default: ['sys'],
				required: true,
				displayOptions: {
					show: {
						resource: ['exportRule'],
						operation: ['create'],
					},
				},
				description: 'Read-write access security flavors',
			},

			// Export Rule Create Options
			{
				displayName: 'Additional Options',
				name: 'ruleCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['exportRule'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Anonymous User',
						name: 'anonymousUser',
						type: 'string',
						default: '65534',
						description: 'User ID for anonymous requests',
					},
					{
						displayName: 'Protocols',
						name: 'protocols',
						type: 'multiOptions',
						options: [
							{ name: 'Any', value: 'any' },
							{ name: 'CIFS', value: 'cifs' },
							{ name: 'FlexCache', value: 'flexcache' },
							{ name: 'NFS', value: 'nfs' },
							{ name: 'NFS3', value: 'nfs3' },
							{ name: 'NFS4', value: 'nfs4' },
						],
						default: ['any'],
					},
					{
						displayName: 'Rule Index',
						name: 'index',
						type: 'number',
						default: 0,
						description: 'Rule index (0 for auto-assign)',
					},
					{
						displayName: 'Superuser',
						name: 'superuser',
						type: 'multiOptions',
						options: [
							{ name: 'Any', value: 'any' },
							{ name: 'Krb5', value: 'krb5' },
							{ name: 'Krb5i', value: 'krb5i' },
							{ name: 'Krb5p', value: 'krb5p' },
							{ name: 'None', value: 'none' },
							{ name: 'NTLM', value: 'ntlm' },
							{ name: 'Sys', value: 'sys' },
						],
						default: ['sys'],
					},
				],
			},

			// Export Rule Update Fields
			{
				displayName: 'Update Fields',
				name: 'ruleUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['exportRule'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Anonymous User',
						name: 'anonymousUser',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Clients',
						name: 'clients',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Protocols',
						name: 'protocols',
						type: 'multiOptions',
						options: [
							{ name: 'Any', value: 'any' },
							{ name: 'CIFS', value: 'cifs' },
							{ name: 'FlexCache', value: 'flexcache' },
							{ name: 'NFS', value: 'nfs' },
							{ name: 'NFS3', value: 'nfs3' },
							{ name: 'NFS4', value: 'nfs4' },
						],
						default: [],
					},
					{
						displayName: 'RO Rule',
						name: 'roRule',
						type: 'multiOptions',
						options: [
							{ name: 'Any', value: 'any' },
							{ name: 'Krb5', value: 'krb5' },
							{ name: 'Krb5i', value: 'krb5i' },
							{ name: 'Krb5p', value: 'krb5p' },
							{ name: 'Never', value: 'never' },
							{ name: 'None', value: 'none' },
							{ name: 'NTLM', value: 'ntlm' },
							{ name: 'Sys', value: 'sys' },
						],
						default: [],
					},
					{
						displayName: 'RW Rule',
						name: 'rwRule',
						type: 'multiOptions',
						options: [
							{ name: 'Any', value: 'any' },
							{ name: 'Krb5', value: 'krb5' },
							{ name: 'Krb5i', value: 'krb5i' },
							{ name: 'Krb5p', value: 'krb5p' },
							{ name: 'Never', value: 'never' },
							{ name: 'None', value: 'none' },
							{ name: 'NTLM', value: 'ntlm' },
							{ name: 'Sys', value: 'sys' },
						],
						default: [],
					},
					{
						displayName: 'Superuser',
						name: 'superuser',
						type: 'multiOptions',
						options: [
							{ name: 'Any', value: 'any' },
							{ name: 'Krb5', value: 'krb5' },
							{ name: 'Krb5i', value: 'krb5i' },
							{ name: 'Krb5p', value: 'krb5p' },
							{ name: 'None', value: 'none' },
							{ name: 'NTLM', value: 'ntlm' },
							{ name: 'Sys', value: 'sys' },
						],
						default: [],
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

				// Helper to get SVM UUID
				const getSvmUuid = async (svmName: string): Promise<string> => {
					const svms = await ontapApiRequestAllItems.call(this, 'GET', '/svm/svms', {}, { name: svmName });
					if (svms.length === 0) throw new Error(`SVM "${svmName}" not found`);
					return svms[0].uuid as string;
				};

				// ========== CIFS SHARE ==========
				if (resource === 'cifsShare') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/protocols/cifs/shares', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/protocols/cifs/shares', {}, qs);
						}
					} else if (operation === 'get') {
						const svmLocator = this.getNodeParameter('shareSvm', i) as { mode: string; value: string };
						const shareLocator = this.getNodeParameter('shareName', i) as { mode: string; value: string };
						const svmUuid = await getSvmUuid(svmLocator.value);
						responseData = await ontapApiRequest.call(this, 'GET', `/protocols/cifs/shares/${svmUuid}/${encodeURIComponent(shareLocator.value)}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('newShareName', i) as string;
						const svmLocator = this.getNodeParameter('newShareSvm', i) as { mode: string; value: string };
						const path = this.getNodeParameter('sharePath', i) as string;
						const createOptions = this.getNodeParameter('shareCreateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							name,
							svm: { name: svmLocator.value },
							path,
						};

						if (createOptions.comment) body.comment = createOptions.comment;
						if (createOptions.continuouslyAvailable !== undefined) body.continuously_available = createOptions.continuouslyAvailable;
						if (createOptions.encryptionRequired !== undefined) body.encryption = createOptions.encryptionRequired;
						if (createOptions.namespaceCaching !== undefined) body.namespace_caching = createOptions.namespaceCaching;
						if (createOptions.offlineFiles) body.offline_files = createOptions.offlineFiles;
						if (createOptions.oplocks !== undefined) body.oplocks = createOptions.oplocks;
						if (createOptions.unixSymlink) body.unix_symlink = createOptions.unixSymlink;

						const response = await ontapApiRequest.call(this, 'POST', '/protocols/cifs/shares', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const svmLocator = this.getNodeParameter('shareSvm', i) as { mode: string; value: string };
						const shareLocator = this.getNodeParameter('shareName', i) as { mode: string; value: string };
						const updateFields = this.getNodeParameter('shareUpdateFields', i) as IDataObject;
						const svmUuid = await getSvmUuid(svmLocator.value);

						const body: IDataObject = {};
						if (updateFields.comment) body.comment = updateFields.comment;
						if (updateFields.continuouslyAvailable !== undefined) body.continuously_available = updateFields.continuouslyAvailable;
						if (updateFields.encryptionRequired !== undefined) body.encryption = updateFields.encryptionRequired;
						if (updateFields.oplocks !== undefined) body.oplocks = updateFields.oplocks;

						const response = await ontapApiRequest.call(this, 'PATCH', `/protocols/cifs/shares/${svmUuid}/${encodeURIComponent(shareLocator.value)}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const svmLocator = this.getNodeParameter('shareSvm', i) as { mode: string; value: string };
						const shareLocator = this.getNodeParameter('shareName', i) as { mode: string; value: string };
						const svmUuid = await getSvmUuid(svmLocator.value);

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/cifs/shares/${svmUuid}/${encodeURIComponent(shareLocator.value)}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: shareLocator.value };
						}
					}
				}

				// ========== CIFS SERVICE ==========
				else if (resource === 'cifsService') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/protocols/cifs/services', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/protocols/cifs/services', {}, qs);
						}
					} else if (operation === 'get') {
						const svmLocator = this.getNodeParameter('cifsSvm', i) as { mode: string; value: string };
						const svmUuid = await getSvmUuid(svmLocator.value);
						responseData = await ontapApiRequest.call(this, 'GET', `/protocols/cifs/services/${svmUuid}`, {}, qs);
					} else if (operation === 'create') {
						const svmLocator = this.getNodeParameter('cifsSvm', i) as { mode: string; value: string };
						const name = this.getNodeParameter('cifsName', i) as string;
						const domain = this.getNodeParameter('cifsDomain', i) as string;
						const adUser = this.getNodeParameter('cifsAdUser', i) as string;
						const adPassword = this.getNodeParameter('cifsAdPassword', i) as string;
						const createOptions = this.getNodeParameter('cifsCreateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							svm: { name: svmLocator.value },
							name,
							ad_domain: {
								fqdn: domain,
								user: adUser,
								password: adPassword,
							},
						};

						if (createOptions.comment) body.comment = createOptions.comment;
						if (createOptions.defaultUnixUser) body.default_unix_user = createOptions.defaultUnixUser;
						if (createOptions.ou) (body.ad_domain as IDataObject).organizational_unit = createOptions.ou;

						const response = await ontapApiRequest.call(this, 'POST', '/protocols/cifs/services', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const svmLocator = this.getNodeParameter('cifsSvm', i) as { mode: string; value: string };
						const updateFields = this.getNodeParameter('cifsUpdateFields', i) as IDataObject;
						const svmUuid = await getSvmUuid(svmLocator.value);

						const body: IDataObject = {};
						if (updateFields.comment) body.comment = updateFields.comment;
						if (updateFields.defaultUnixUser) body.default_unix_user = updateFields.defaultUnixUser;
						if (updateFields.enabled !== undefined) body.enabled = updateFields.enabled;

						const response = await ontapApiRequest.call(this, 'PATCH', `/protocols/cifs/services/${svmUuid}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const svmLocator = this.getNodeParameter('cifsSvm', i) as { mode: string; value: string };
						const svmUuid = await getSvmUuid(svmLocator.value);

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/cifs/services/${svmUuid}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: svmLocator.value };
						}
					}
				}

				// ========== CIFS SESSION ==========
				else if (resource === 'cifsSession') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/protocols/cifs/sessions', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/protocols/cifs/sessions', {}, qs);
						}
					} else if (operation === 'delete') {
						const svmLocator = this.getNodeParameter('sessionSvm', i) as { mode: string; value: string };
						const sessionId = this.getNodeParameter('sessionId', i) as string;
						const connectionId = this.getNodeParameter('connectionId', i) as string;
						const svmUuid = await getSvmUuid(svmLocator.value);

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/cifs/sessions/${svmUuid}/${sessionId}/${connectionId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: `${sessionId}/${connectionId}` };
						}
					}
				}

				// ========== NFS SERVICE ==========
				else if (resource === 'nfsService') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/protocols/nfs/services', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/protocols/nfs/services', {}, qs);
						}
					} else if (operation === 'get') {
						const svmLocator = this.getNodeParameter('nfsSvm', i) as { mode: string; value: string };
						const svmUuid = await getSvmUuid(svmLocator.value);
						responseData = await ontapApiRequest.call(this, 'GET', `/protocols/nfs/services/${svmUuid}`, {}, qs);
					} else if (operation === 'create') {
						const svmLocator = this.getNodeParameter('nfsSvm', i) as { mode: string; value: string };
						const createOptions = this.getNodeParameter('nfsCreateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							svm: { name: svmLocator.value },
							enabled: true,
						};

						const protocol: IDataObject = {};
						if (createOptions.nfsv3Enabled !== undefined) protocol.v3_enabled = createOptions.nfsv3Enabled;
						if (createOptions.nfsv4Enabled !== undefined) protocol.v40_enabled = createOptions.nfsv4Enabled;
						if (createOptions.nfsv41Enabled !== undefined) protocol.v41_enabled = createOptions.nfsv41Enabled;
						if (Object.keys(protocol).length > 0) body.protocol = protocol;

						if (createOptions.showmountEnabled !== undefined) body.showmount_enabled = createOptions.showmountEnabled;
						if (createOptions.vstorageEnabled !== undefined) body.vstorage_enabled = createOptions.vstorageEnabled;

						const response = await ontapApiRequest.call(this, 'POST', '/protocols/nfs/services', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const svmLocator = this.getNodeParameter('nfsSvm', i) as { mode: string; value: string };
						const updateFields = this.getNodeParameter('nfsUpdateFields', i) as IDataObject;
						const svmUuid = await getSvmUuid(svmLocator.value);

						const body: IDataObject = {};
						if (updateFields.enabled !== undefined) body.enabled = updateFields.enabled;
						if (updateFields.showmountEnabled !== undefined) body.showmount_enabled = updateFields.showmountEnabled;

						const protocol: IDataObject = {};
						if (updateFields.nfsv3Enabled !== undefined) protocol.v3_enabled = updateFields.nfsv3Enabled;
						if (updateFields.nfsv4Enabled !== undefined) protocol.v40_enabled = updateFields.nfsv4Enabled;
						if (updateFields.nfsv41Enabled !== undefined) protocol.v41_enabled = updateFields.nfsv41Enabled;
						if (Object.keys(protocol).length > 0) body.protocol = protocol;

						const response = await ontapApiRequest.call(this, 'PATCH', `/protocols/nfs/services/${svmUuid}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const svmLocator = this.getNodeParameter('nfsSvm', i) as { mode: string; value: string };
						const svmUuid = await getSvmUuid(svmLocator.value);

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/nfs/services/${svmUuid}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: svmLocator.value };
						}
					}
				}

				// ========== EXPORT POLICY ==========
				else if (resource === 'exportPolicy') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/protocols/nfs/export-policies', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/protocols/nfs/export-policies', {}, qs);
						}
					} else if (operation === 'get') {
						const policyLocator = this.getNodeParameter('exportPolicyId', i) as { mode: string; value: string };
						responseData = await ontapApiRequest.call(this, 'GET', `/protocols/nfs/export-policies/${policyLocator.value}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('exportPolicyName', i) as string;
						const svmLocator = this.getNodeParameter('exportPolicySvm', i) as { mode: string; value: string };

						const body: IDataObject = {
							name,
							svm: { name: svmLocator.value },
						};

						const response = await ontapApiRequest.call(this, 'POST', '/protocols/nfs/export-policies', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const policyLocator = this.getNodeParameter('exportPolicyId', i) as { mode: string; value: string };
						const newName = this.getNodeParameter('exportPolicyNewName', i) as string;

						const response = await ontapApiRequest.call(this, 'PATCH', `/protocols/nfs/export-policies/${policyLocator.value}`, {
							name: newName,
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const policyLocator = this.getNodeParameter('exportPolicyId', i) as { mode: string; value: string };

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/nfs/export-policies/${policyLocator.value}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: policyLocator.value };
						}
					}
				}

				// ========== EXPORT RULE ==========
				else if (resource === 'exportRule') {
					const policyLocator = this.getNodeParameter('ruleExportPolicy', i) as { mode: string; value: string };

					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', `/protocols/nfs/export-policies/${policyLocator.value}/rules`, {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', `/protocols/nfs/export-policies/${policyLocator.value}/rules`, {}, qs);
						}
					} else if (operation === 'get') {
						const ruleIndex = this.getNodeParameter('ruleIndex', i) as number;
						responseData = await ontapApiRequest.call(this, 'GET', `/protocols/nfs/export-policies/${policyLocator.value}/rules/${ruleIndex}`, {}, qs);
					} else if (operation === 'create') {
						const clients = this.getNodeParameter('ruleClients', i) as string;
						const roRule = this.getNodeParameter('ruleRoRule', i) as string[];
						const rwRule = this.getNodeParameter('ruleRwRule', i) as string[];
						const createOptions = this.getNodeParameter('ruleCreateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							clients: clients.split(',').map((c) => ({ match: c.trim() })),
							ro_rule: roRule,
							rw_rule: rwRule,
						};

						if (createOptions.anonymousUser) body.anonymous_user = createOptions.anonymousUser;
						if (createOptions.protocols && (createOptions.protocols as string[]).length > 0) {
							body.protocols = createOptions.protocols;
						}
						if (createOptions.index && (createOptions.index as number) > 0) {
							body.index = createOptions.index;
						}
						if (createOptions.superuser && (createOptions.superuser as string[]).length > 0) {
							body.superuser = createOptions.superuser;
						}

						const response = await ontapApiRequest.call(this, 'POST', `/protocols/nfs/export-policies/${policyLocator.value}/rules`, body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const ruleIndex = this.getNodeParameter('ruleIndex', i) as number;
						const updateFields = this.getNodeParameter('ruleUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.anonymousUser) body.anonymous_user = updateFields.anonymousUser;
						if (updateFields.clients) {
							body.clients = (updateFields.clients as string).split(',').map((c) => ({ match: c.trim() }));
						}
						if (updateFields.protocols && (updateFields.protocols as string[]).length > 0) {
							body.protocols = updateFields.protocols;
						}
						if (updateFields.roRule && (updateFields.roRule as string[]).length > 0) {
							body.ro_rule = updateFields.roRule;
						}
						if (updateFields.rwRule && (updateFields.rwRule as string[]).length > 0) {
							body.rw_rule = updateFields.rwRule;
						}
						if (updateFields.superuser && (updateFields.superuser as string[]).length > 0) {
							body.superuser = updateFields.superuser;
						}

						const response = await ontapApiRequest.call(this, 'PATCH', `/protocols/nfs/export-policies/${policyLocator.value}/rules/${ruleIndex}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const ruleIndex = this.getNodeParameter('ruleIndex', i) as number;

						const response = await ontapApiRequest.call(this, 'DELETE', `/protocols/nfs/export-policies/${policyLocator.value}/rules/${ruleIndex}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: ruleIndex };
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
