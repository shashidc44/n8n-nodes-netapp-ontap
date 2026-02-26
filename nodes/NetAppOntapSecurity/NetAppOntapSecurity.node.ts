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

export class NetAppOntapSecurity implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NetApp ONTAP Security',
		name: 'netAppOntapSecurity',
		icon: 'file:netapp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage NetApp ONTAP security settings, users, roles, and certificates',
		defaults: {
			name: 'ONTAP Security',
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
						name: 'Account',
						value: 'account',
						description: 'Manage user accounts',
					},
					{
						name: 'Audit',
						value: 'audit',
						description: 'Manage audit configuration',
					},
					{
						name: 'Certificate',
						value: 'certificate',
						description: 'Manage security certificates',
					},
					{
						name: 'Key Manager',
						value: 'keyManager',
						description: 'Manage external key managers',
					},
					{
						name: 'Login Messages',
						value: 'loginMessages',
						description: 'Manage login banner and MOTD',
					},
					{
						name: 'Role',
						value: 'role',
						description: 'Manage security roles',
					},
					{
						name: 'SSH',
						value: 'ssh',
						description: 'Manage SSH settings',
					},
				],
				default: 'account',
			},

			// ===================
			// ACCOUNT OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['account'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new user account',
						action: 'Create user account',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a user account',
						action: 'Delete user account',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get user account details',
						action: 'Get user account',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all user accounts',
						action: 'Get many user accounts',
					},
					{
						name: 'Lock',
						value: 'lock',
						description: 'Lock a user account',
						action: 'Lock user account',
					},
					{
						name: 'Unlock',
						value: 'unlock',
						description: 'Unlock a user account',
						action: 'Unlock user account',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a user account',
						action: 'Update user account',
					},
					{
						name: 'Set Password',
						value: 'setPassword',
						description: 'Set user account password',
						action: 'Set account password',
					},
				],
				default: 'getMany',
			},

			// Account Selection
			{
				displayName: 'Account',
				name: 'accountId',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['get', 'update', 'delete', 'lock', 'unlock', 'setPassword'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},

			// Account Create Fields
			{
				displayName: 'Username',
				name: 'accountName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Owner',
				name: 'accountOwner',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['create'],
					},
				},
				description: 'Cluster or SVM that owns this account',
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},
			{
				displayName: 'Role',
				name: 'accountRole',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['account'],
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
				displayName: 'Applications',
				name: 'accountApplications',
				type: 'multiOptions',
				options: [
					{ name: 'AMQP', value: 'amqp' },
					{ name: 'Console', value: 'console' },
					{ name: 'HTTP', value: 'http' },
					{ name: 'ONTAPI', value: 'ontapi' },
					{ name: 'Service Processor', value: 'service_processor' },
					{ name: 'SSH', value: 'ssh' },
				],
				default: ['ssh', 'http'],
				required: true,
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Authentication Method',
				name: 'authMethod',
				type: 'options',
				options: [
					{ name: 'Certificate', value: 'certificate' },
					{ name: 'Domain', value: 'domain' },
					{ name: 'LDAP', value: 'ldap' },
					{ name: 'NIS', value: 'nis' },
					{ name: 'NSSWITCH', value: 'nsswitch' },
					{ name: 'Password', value: 'password' },
					{ name: 'Public Key', value: 'publickey' },
					{ name: 'SAML', value: 'saml' },
					{ name: 'TOTP', value: 'totp' },
				],
				default: 'password',
				required: true,
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['create'],
					},
				},
			},

			// Account Create Options
			{
				displayName: 'Additional Options',
				name: 'accountCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['account'],
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
						displayName: 'Locked',
						name: 'locked',
						type: 'boolean',
						default: false,
						description: 'Whether account is locked initially',
					},
					{
						displayName: 'Password',
						name: 'password',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description: 'Initial password for password authentication',
					},
					{
						displayName: 'Public Key',
						name: 'publicKey',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
						description: 'SSH public key for publickey authentication',
					},
					{
						displayName: 'Second Authentication Method',
						name: 'secondAuthMethod',
						type: 'options',
						options: [
							{ name: 'None', value: 'none' },
							{ name: 'Certificate', value: 'certificate' },
							{ name: 'Domain', value: 'domain' },
							{ name: 'LDAP', value: 'ldap' },
							{ name: 'NIS', value: 'nis' },
							{ name: 'NSSWITCH', value: 'nsswitch' },
							{ name: 'Password', value: 'password' },
							{ name: 'Public Key', value: 'publickey' },
							{ name: 'TOTP', value: 'totp' },
						],
						default: 'none',
						description: 'Second factor authentication method',
					},
				],
			},

			// Set Password Fields
			{
				displayName: 'New Password',
				name: 'newPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['setPassword'],
					},
				},
			},

			// Account Update Fields
			{
				displayName: 'Update Fields',
				name: 'accountUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['account'],
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
						displayName: 'Role',
						name: 'role',
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

			// ===================
			// ROLE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['role'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new role',
						action: 'Create role',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a role',
						action: 'Delete role',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get role details',
						action: 'Get role',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all roles',
						action: 'Get many roles',
					},
					{
						name: 'Add Privilege',
						value: 'addPrivilege',
						description: 'Add privilege to a role',
						action: 'Add privilege to role',
					},
					{
						name: 'Remove Privilege',
						value: 'removePrivilege',
						description: 'Remove privilege from a role',
						action: 'Remove privilege from role',
					},
				],
				default: 'getMany',
			},

			// Role Selection
			{
				displayName: 'Role',
				name: 'roleId',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['role'],
						operation: ['get', 'delete', 'addPrivilege', 'removePrivilege'],
					},
				},
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},

			// Role Create Fields
			{
				displayName: 'Role Name',
				name: 'roleName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['role'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Owner',
				name: 'roleOwner',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['role'],
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

			// Role Privilege Fields
			{
				displayName: 'Command/Path',
				name: 'privilegePath',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['role'],
						operation: ['addPrivilege', 'removePrivilege'],
					},
				},
				placeholder: 'volume',
				description: 'Command directory path (e.g., volume, volume snapshot)',
			},
			{
				displayName: 'Access Level',
				name: 'privilegeAccess',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'None', value: 'none' },
					{ name: 'Read-Only', value: 'readonly' },
				],
				default: 'all',
				required: true,
				displayOptions: {
					show: {
						resource: ['role'],
						operation: ['addPrivilege'],
					},
				},
			},

			// ===================
			// CERTIFICATE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['certificate'],
					},
				},
				options: [
					{
						name: 'Create (Self-Signed)',
						value: 'createSelfSigned',
						description: 'Create a self-signed certificate',
						action: 'Create self-signed certificate',
					},
					{
						name: 'Create (CSR)',
						value: 'createCsr',
						description: 'Create a certificate signing request',
						action: 'Create certificate signing request',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a certificate',
						action: 'Delete certificate',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get certificate details',
						action: 'Get certificate',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all certificates',
						action: 'Get many certificates',
					},
					{
						name: 'Install',
						value: 'install',
						description: 'Install a CA-signed certificate',
						action: 'Install certificate',
					},
					{
						name: 'Sign',
						value: 'sign',
						description: 'Sign a certificate with CA',
						action: 'Sign certificate',
					},
				],
				default: 'getMany',
			},

			// Certificate Selection
			{
				displayName: 'Certificate',
				name: 'certificateId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['certificate'],
						operation: ['get', 'delete', 'sign'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// Certificate Create Fields
			{
				displayName: 'Common Name',
				name: 'certCommonName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['certificate'],
						operation: ['createSelfSigned', 'createCsr'],
					},
				},
				placeholder: 'cluster.example.com',
			},
			{
				displayName: 'Certificate Type',
				name: 'certType',
				type: 'options',
				options: [
					{ name: 'Client', value: 'client' },
					{ name: 'Client CA', value: 'client_ca' },
					{ name: 'Root CA', value: 'root_ca' },
					{ name: 'Server', value: 'server' },
					{ name: 'Server CA', value: 'server_ca' },
				],
				default: 'server',
				required: true,
				displayOptions: {
					show: {
						resource: ['certificate'],
						operation: ['createSelfSigned', 'createCsr'],
					},
				},
			},
			{
				displayName: 'SVM',
				name: 'certSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				displayOptions: {
					show: {
						resource: ['certificate'],
						operation: ['createSelfSigned', 'createCsr', 'install'],
					},
				},
				description: 'SVM scope (leave empty for cluster-scoped)',
				modes: [					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
					},
				],
			},

			// Certificate Create Options
			{
				displayName: 'Additional Options',
				name: 'certCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['certificate'],
						operation: ['createSelfSigned', 'createCsr'],
					},
				},
				options: [
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
						placeholder: 'US',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Expiry Days',
						name: 'expiryDays',
						type: 'number',
						default: 365,
					},
					{
						displayName: 'Hash Function',
						name: 'hashFunction',
						type: 'options',
						options: [
							{ name: 'SHA256', value: 'sha256' },
							{ name: 'SHA384', value: 'sha384' },
							{ name: 'SHA512', value: 'sha512' },
						],
						default: 'sha256',
					},
					{
						displayName: 'Key Size',
						name: 'keySize',
						type: 'options',
						options: [
							{ name: '2048', value: 2048 },
							{ name: '3072', value: 3072 },
							{ name: '4096', value: 4096 },
						],
						default: 2048,
					},
					{
						displayName: 'Locality',
						name: 'locality',
						type: 'string',
						default: '',
						placeholder: 'San Jose',
					},
					{
						displayName: 'Organization',
						name: 'organization',
						type: 'string',
						default: '',
					},
					{
						displayName: 'State',
						name: 'state',
						type: 'string',
						default: '',
						placeholder: 'California',
					},
					{
						displayName: 'Unit',
						name: 'unit',
						type: 'string',
						default: '',
						description: 'Organizational unit',
					},
				],
			},

			// Certificate Install Fields
			{
				displayName: 'Certificate PEM',
				name: 'certPem',
				type: 'string',
				typeOptions: { rows: 8 },
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['certificate'],
						operation: ['install'],
					},
				},
				placeholder: '-----BEGIN CERTIFICATE-----\n...',
			},
			{
				displayName: 'Private Key PEM',
				name: 'privateKeyPem',
				type: 'string',
				typeOptions: { rows: 8, password: true },
				default: '',
				displayOptions: {
					show: {
						resource: ['certificate'],
						operation: ['install'],
					},
				},
				description: 'Required for server/client certificates',
			},
			{
				displayName: 'Certificate Type',
				name: 'installCertType',
				type: 'options',
				options: [
					{ name: 'Client', value: 'client' },
					{ name: 'Client CA', value: 'client_ca' },
					{ name: 'Root CA', value: 'root_ca' },
					{ name: 'Server', value: 'server' },
					{ name: 'Server CA', value: 'server_ca' },
				],
				default: 'server',
				required: true,
				displayOptions: {
					show: {
						resource: ['certificate'],
						operation: ['install'],
					},
				},
			},

			// Certificate Sign Fields (for CA)
			{
				displayName: 'CSR to Sign',
				name: 'csrToSign',
				type: 'string',
				typeOptions: { rows: 8 },
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['certificate'],
						operation: ['sign'],
					},
				},
				placeholder: '-----BEGIN CERTIFICATE REQUEST-----\n...',
			},
			{
				displayName: 'Expiry Days',
				name: 'signExpiryDays',
				type: 'number',
				default: 365,
				displayOptions: {
					show: {
						resource: ['certificate'],
						operation: ['sign'],
					},
				},
			},

			// ===================
			// KEY MANAGER OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['keyManager'],
					},
				},
				options: [
					{
						name: 'Configure External',
						value: 'configureExternal',
						description: 'Configure external key manager (KMIP)',
						action: 'Configure external key manager',
					},
					{
						name: 'Configure Onboard',
						value: 'configureOnboard',
						description: 'Configure onboard key manager',
						action: 'Configure onboard key manager',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete key manager configuration',
						action: 'Delete key manager',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get key manager configuration',
						action: 'Get key manager',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all key manager configurations',
						action: 'Get many key managers',
					},
					{
						name: 'Sync',
						value: 'sync',
						description: 'Sync onboard key manager',
						action: 'Sync key manager',
					},
				],
				default: 'getMany',
			},

			// Key Manager Selection
			{
				displayName: 'Key Manager',
				name: 'keyManagerId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['keyManager'],
						operation: ['get', 'delete', 'sync'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// External Key Manager Fields
			{
				displayName: 'KMIP Server URI',
				name: 'kmipServerUri',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['keyManager'],
						operation: ['configureExternal'],
					},
				},
				placeholder: 'kmip.example.com:5696',
			},
			{
				displayName: 'Client Certificate',
				name: 'kmipClientCert',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['keyManager'],
						operation: ['configureExternal'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},
			{
				displayName: 'Server CA Certificates',
				name: 'kmipServerCaCerts',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['keyManager'],
						operation: ['configureExternal'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// Onboard Key Manager Fields
			{
				displayName: 'Passphrase',
				name: 'onboardPassphrase',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['keyManager'],
						operation: ['configureOnboard', 'sync'],
					},
				},
				description: 'Cluster-wide passphrase (32+ characters)',
			},

			// ===================
			// SSH OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['ssh'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get SSH server settings',
						action: 'Get SSH settings',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update SSH server settings',
						action: 'Update SSH settings',
					},
				],
				default: 'get',
			},

			// SSH Update Fields
			{
				displayName: 'Update Fields',
				name: 'sshUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['ssh'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Ciphers',
						name: 'ciphers',
						type: 'multiOptions',
						options: [
							{ name: 'AES128-CTR', value: 'aes128_ctr' },
							{ name: 'AES192-CTR', value: 'aes192_ctr' },
							{ name: 'AES256-CTR', value: 'aes256_ctr' },
							{ name: 'AES128-GCM', value: 'aes128_gcm' },
							{ name: 'AES256-GCM', value: 'aes256_gcm' },
						],
						default: [],
					},
					{
						displayName: 'Key Exchange Algorithms',
						name: 'keyExchangeAlgorithms',
						type: 'multiOptions',
						options: [
							{ name: 'Diffie-Hellman-Group14-SHA1', value: 'diffie_hellman_group14_sha1' },
							{ name: 'Diffie-Hellman-Group-Exchange-SHA256', value: 'diffie_hellman_group_exchange_sha256' },
							{ name: 'ECDH-SHA2-NISTP256', value: 'ecdh_sha2_nistp256' },
							{ name: 'ECDH-SHA2-NISTP384', value: 'ecdh_sha2_nistp384' },
							{ name: 'ECDH-SHA2-NISTP521', value: 'ecdh_sha2_nistp521' },
						],
						default: [],
					},
					{
						displayName: 'MAC Algorithms',
						name: 'macAlgorithms',
						type: 'multiOptions',
						options: [
							{ name: 'HMAC-SHA1', value: 'hmac_sha1' },
							{ name: 'HMAC-SHA2-256', value: 'hmac_sha2_256' },
							{ name: 'HMAC-SHA2-512', value: 'hmac_sha2_512' },
							{ name: 'HMAC-SHA2-256-ETM', value: 'hmac_sha2_256_etm' },
							{ name: 'HMAC-SHA2-512-ETM', value: 'hmac_sha2_512_etm' },
						],
						default: [],
					},
					{
						displayName: 'Max Authentication Retry',
						name: 'maxAuthenticationRetry',
						type: 'number',
						default: 3,
					},
					{
						displayName: 'Per Source Limit',
						name: 'perSourceLimit',
						type: 'number',
						default: 0,
						description: 'Max connections per source (0 for unlimited)',
					},
				],
			},

			// ===================
			// AUDIT OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['audit'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get audit configuration',
						action: 'Get audit configuration',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update audit configuration',
						action: 'Update audit configuration',
					},
				],
				default: 'get',
			},

			// Audit Update Fields
			{
				displayName: 'Update Fields',
				name: 'auditUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['audit'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'CLI Get Enabled',
						name: 'cliGet',
						type: 'boolean',
						default: false,
						description: 'Whether to log CLI GET requests',
					},
					{
						displayName: 'HTTP Get Enabled',
						name: 'httpGet',
						type: 'boolean',
						default: false,
						description: 'Whether to log HTTP GET requests',
					},
					{
						displayName: 'ONTAPI Get Enabled',
						name: 'ontapiGet',
						type: 'boolean',
						default: false,
						description: 'Whether to log ONTAPI GET requests',
					},
				],
			},

			// ===================
			// LOGIN MESSAGES OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['loginMessages'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get login messages',
						action: 'Get login messages',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all login messages (all SVMs)',
						action: 'Get many login messages',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update login messages',
						action: 'Update login messages',
					},
				],
				default: 'getMany',
			},

			// Login Messages SVM Selection
			{
				displayName: 'SVM',
				name: 'loginMessagesSvm',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['loginMessages'],
						operation: ['get', 'update'],
					},
				},
				modes: [					{
						displayName: 'By UUID',
						name: 'uuid',
						type: 'string',
					},
				],
			},

			// Login Messages Update Fields
			{
				displayName: 'Update Fields',
				name: 'loginMessagesUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['loginMessages'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Banner',
						name: 'banner',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
						description: 'Login banner displayed before authentication',
					},
					{
						displayName: 'Message',
						name: 'message',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
						description: 'Message of the day displayed after login',
					},
					{
						displayName: 'Show Cluster Message',
						name: 'showClusterMessage',
						type: 'boolean',
						default: true,
						description: 'Whether to show cluster-level message for SVM logins',
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

				// ========== ACCOUNT ==========
				if (resource === 'account') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}

						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/security/accounts', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/security/accounts', {}, qs);
						}
					} else if (operation === 'get') {
						const acctLocator = this.getNodeParameter('accountId', i) as { mode: string; value: string };
						const [ownerUuid, accountName] = acctLocator.value.split('/');
						responseData = await ontapApiRequest.call(this, 'GET', `/security/accounts/${ownerUuid}/${accountName}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('accountName', i) as string;
						const ownerLocator = this.getNodeParameter('accountOwner', i) as { mode: string; value: string };
						const roleLocator = this.getNodeParameter('accountRole', i) as { mode: string; value: string };
						const applications = this.getNodeParameter('accountApplications', i) as string[];
						const authMethod = this.getNodeParameter('authMethod', i) as string;
						const createOptions = this.getNodeParameter('accountCreateOptions', i, {}) as IDataObject;

						const [, roleName] = roleLocator.value.includes('/') ? roleLocator.value.split('/') : [null, roleLocator.value];

						const body: IDataObject = {
							name,
							owner: { uuid: ownerLocator.value },
							role: { name: roleName },
							applications: applications.map((app) => ({
								application: app,
								authentication_methods: [authMethod],
								second_authentication_method: createOptions.secondAuthMethod !== 'none' ? createOptions.secondAuthMethod : undefined,
							})),
						};

						if (createOptions.comment) body.comment = createOptions.comment;
						if (createOptions.locked !== undefined) body.locked = createOptions.locked;
						if (createOptions.password) body.password = createOptions.password;

						const response = await ontapApiRequest.call(this, 'POST', '/security/accounts', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);

						// Add public key if provided
						if (createOptions.publicKey && authMethod === 'publickey') {
							await ontapApiRequest.call(this, 'POST', `/security/accounts/${ownerLocator.value}/${name}/keys`, {
								public_key: createOptions.publicKey,
							});
						}
					} else if (operation === 'update') {
						const acctLocator = this.getNodeParameter('accountId', i) as { mode: string; value: string };
						const [ownerUuid, accountName] = acctLocator.value.split('/');
						const updateFields = this.getNodeParameter('accountUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.comment) body.comment = updateFields.comment;
						if (updateFields.role) {
							const roleLocator = updateFields.role as { mode: string; value: string };
							const [, roleName] = roleLocator.value.includes('/') ? roleLocator.value.split('/') : [null, roleLocator.value];
							body.role = { name: roleName };
						}

						const response = await ontapApiRequest.call(this, 'PATCH', `/security/accounts/${ownerUuid}/${accountName}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const acctLocator = this.getNodeParameter('accountId', i) as { mode: string; value: string };
						const [ownerUuid, accountName] = acctLocator.value.split('/');

						await ontapApiRequest.call(this, 'DELETE', `/security/accounts/${ownerUuid}/${accountName}`);
						responseData = { success: true, deleted: `${ownerUuid}/${accountName}` };
					} else if (operation === 'lock') {
						const acctLocator = this.getNodeParameter('accountId', i) as { mode: string; value: string };
						const [ownerUuid, accountName] = acctLocator.value.split('/');

						const response = await ontapApiRequest.call(this, 'PATCH', `/security/accounts/${ownerUuid}/${accountName}`, { locked: true });
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'unlock') {
						const acctLocator = this.getNodeParameter('accountId', i) as { mode: string; value: string };
						const [ownerUuid, accountName] = acctLocator.value.split('/');

						const response = await ontapApiRequest.call(this, 'PATCH', `/security/accounts/${ownerUuid}/${accountName}`, { locked: false });
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'setPassword') {
						const acctLocator = this.getNodeParameter('accountId', i) as { mode: string; value: string };
						const [ownerUuid, accountName] = acctLocator.value.split('/');
						const newPassword = this.getNodeParameter('newPassword', i) as string;

						const response = await ontapApiRequest.call(this, 'PATCH', `/security/accounts/${ownerUuid}/${accountName}`, { password: newPassword });
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, message: 'Password updated' };
						}
					}
				}

				// ========== ROLE ==========
				else if (resource === 'role') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}

						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/security/roles', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/security/roles', {}, qs);
						}
					} else if (operation === 'get') {
						const roleLocator = this.getNodeParameter('roleId', i) as { mode: string; value: string };
						const [ownerUuid, roleName] = roleLocator.value.split('/');
						responseData = await ontapApiRequest.call(this, 'GET', `/security/roles/${ownerUuid}/${roleName}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('roleName', i) as string;
						const ownerLocator = this.getNodeParameter('roleOwner', i) as { mode: string; value: string };

						const body: IDataObject = {
							name,
							owner: { uuid: ownerLocator.value },
						};

						const response = await ontapApiRequest.call(this, 'POST', '/security/roles', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const roleLocator = this.getNodeParameter('roleId', i) as { mode: string; value: string };
						const [ownerUuid, roleName] = roleLocator.value.split('/');

						await ontapApiRequest.call(this, 'DELETE', `/security/roles/${ownerUuid}/${roleName}`);
						responseData = { success: true, deleted: `${ownerUuid}/${roleName}` };
					} else if (operation === 'addPrivilege') {
						const roleLocator = this.getNodeParameter('roleId', i) as { mode: string; value: string };
						const [ownerUuid, roleName] = roleLocator.value.split('/');
						const path = this.getNodeParameter('privilegePath', i) as string;
						const access = this.getNodeParameter('privilegeAccess', i) as string;

						const response = await ontapApiRequest.call(this, 'POST', `/security/roles/${ownerUuid}/${roleName}/privileges`, {
							path,
							access,
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'removePrivilege') {
						const roleLocator = this.getNodeParameter('roleId', i) as { mode: string; value: string };
						const [ownerUuid, roleName] = roleLocator.value.split('/');
						const path = this.getNodeParameter('privilegePath', i) as string;

						await ontapApiRequest.call(this, 'DELETE', `/security/roles/${ownerUuid}/${roleName}/privileges/${encodeURIComponent(path)}`);
						responseData = { success: true, removedPrivilege: path };
					}
				}

				// ========== CERTIFICATE ==========
				else if (resource === 'certificate') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}

						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/security/certificates', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/security/certificates', {}, qs);
						}
					} else if (operation === 'get') {
						const certLocator = this.getNodeParameter('certificateId', i) as { mode: string; value: string };
						responseData = await ontapApiRequest.call(this, 'GET', `/security/certificates/${certLocator.value}`, {}, qs);
					} else if (operation === 'createSelfSigned') {
						const commonName = this.getNodeParameter('certCommonName', i) as string;
						const certType = this.getNodeParameter('certType', i) as string;
						const svmLocator = this.getNodeParameter('certSvm', i, { value: '' }) as { mode: string; value: string };
						const createOptions = this.getNodeParameter('certCreateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							common_name: commonName,
							type: certType,
						};

						if (svmLocator?.value) {
							body.svm = { name: svmLocator.value };
						}

						if (createOptions.expiryDays) body.expiry_time = `P${createOptions.expiryDays}D`;
						if (createOptions.hashFunction) body.hash_function = createOptions.hashFunction;
						if (createOptions.keySize) body.key_size = createOptions.keySize;
						if (createOptions.country) body.country = createOptions.country;
						if (createOptions.state) body.state = createOptions.state;
						if (createOptions.locality) body.locality = createOptions.locality;
						if (createOptions.organization) body.organization = createOptions.organization;
						if (createOptions.unit) body.unit = createOptions.unit;
						if (createOptions.email) body.email = createOptions.email;

						const response = await ontapApiRequest.call(this, 'POST', '/security/certificates', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'createCsr') {
						const commonName = this.getNodeParameter('certCommonName', i) as string;
						const certType = this.getNodeParameter('certType', i) as string;
						const svmLocator = this.getNodeParameter('certSvm', i, { value: '' }) as { mode: string; value: string };
						const createOptions = this.getNodeParameter('certCreateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							common_name: commonName,
							type: certType,
							generate_csr: true,
						};

						if (svmLocator?.value) {
							body.svm = { name: svmLocator.value };
						}

						if (createOptions.hashFunction) body.hash_function = createOptions.hashFunction;
						if (createOptions.keySize) body.key_size = createOptions.keySize;
						if (createOptions.country) body.country = createOptions.country;
						if (createOptions.state) body.state = createOptions.state;
						if (createOptions.locality) body.locality = createOptions.locality;
						if (createOptions.organization) body.organization = createOptions.organization;
						if (createOptions.unit) body.unit = createOptions.unit;
						if (createOptions.email) body.email = createOptions.email;

						const response = await ontapApiRequest.call(this, 'POST', '/security/certificates', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'install') {
						const certPem = this.getNodeParameter('certPem', i) as string;
						const certType = this.getNodeParameter('installCertType', i) as string;
						const svmLocator = this.getNodeParameter('certSvm', i, { value: '' }) as { mode: string; value: string };
						const privateKeyPem = this.getNodeParameter('privateKeyPem', i, '') as string;

						const body: IDataObject = {
							type: certType,
							public_certificate: certPem,
						};

						if (svmLocator?.value) {
							body.svm = { name: svmLocator.value };
						}

						if (privateKeyPem) {
							body.private_key = privateKeyPem;
						}

						const response = await ontapApiRequest.call(this, 'POST', '/security/certificates', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'sign') {
						const certLocator = this.getNodeParameter('certificateId', i) as { mode: string; value: string };
						const csrToSign = this.getNodeParameter('csrToSign', i) as string;
						const expiryDays = this.getNodeParameter('signExpiryDays', i, 365) as number;

						const response = await ontapApiRequest.call(this, 'POST', `/security/certificates/${certLocator.value}/sign`, {
							signing_request: csrToSign,
							expiry_time: `P${expiryDays}D`,
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const certLocator = this.getNodeParameter('certificateId', i) as { mode: string; value: string };

						await ontapApiRequest.call(this, 'DELETE', `/security/certificates/${certLocator.value}`);
						responseData = { success: true, deleted: certLocator.value };
					}
				}

				// ========== KEY MANAGER ==========
				else if (resource === 'keyManager') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}

						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/security/key-managers', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/security/key-managers', {}, qs);
						}
					} else if (operation === 'get') {
						const kmLocator = this.getNodeParameter('keyManagerId', i) as { mode: string; value: string };
						responseData = await ontapApiRequest.call(this, 'GET', `/security/key-managers/${kmLocator.value}`, {}, qs);
					} else if (operation === 'configureExternal') {
						const serverUri = this.getNodeParameter('kmipServerUri', i) as string;
						const clientCertLocator = this.getNodeParameter('kmipClientCert', i) as { mode: string; value: string };
						const serverCaCertLocator = this.getNodeParameter('kmipServerCaCerts', i) as { mode: string; value: string };

						const body: IDataObject = {
							external: {
								client_certificate: { uuid: clientCertLocator.value },
								server_ca_certificates: [{ uuid: serverCaCertLocator.value }],
								servers: [{ server: serverUri }],
							},
						};

						const response = await ontapApiRequest.call(this, 'POST', '/security/key-managers', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'configureOnboard') {
						const passphrase = this.getNodeParameter('onboardPassphrase', i) as string;

						const body: IDataObject = {
							onboard: {
								passphrase,
							},
						};

						const response = await ontapApiRequest.call(this, 'POST', '/security/key-managers', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'sync') {
						const kmLocator = this.getNodeParameter('keyManagerId', i) as { mode: string; value: string };
						const passphrase = this.getNodeParameter('onboardPassphrase', i) as string;

						const response = await ontapApiRequest.call(this, 'PATCH', `/security/key-managers/${kmLocator.value}`, {
							onboard: { synchronize: true, passphrase },
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const kmLocator = this.getNodeParameter('keyManagerId', i) as { mode: string; value: string };

						await ontapApiRequest.call(this, 'DELETE', `/security/key-managers/${kmLocator.value}`);
						responseData = { success: true, deleted: kmLocator.value };
					}
				}

				// ========== SSH ==========
				else if (resource === 'ssh') {
					if (operation === 'get') {
						responseData = await ontapApiRequest.call(this, 'GET', '/security/ssh', {}, qs);
					} else if (operation === 'update') {
						const updateFields = this.getNodeParameter('sshUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (Array.isArray(updateFields.ciphers) && updateFields.ciphers.length) body.ciphers = updateFields.ciphers;
						if (Array.isArray(updateFields.keyExchangeAlgorithms) && updateFields.keyExchangeAlgorithms.length) {
							body.key_exchange_algorithms = updateFields.keyExchangeAlgorithms;
						}
						if (Array.isArray(updateFields.macAlgorithms) && updateFields.macAlgorithms.length) {
							body.mac_algorithms = updateFields.macAlgorithms;
						}
						if (updateFields.maxAuthenticationRetry !== undefined) {
							body.max_authentication_retry_count = updateFields.maxAuthenticationRetry;
						}
						if (updateFields.perSourceLimit !== undefined) {
							body.connections_per_second = updateFields.perSourceLimit;
						}

						const response = await ontapApiRequest.call(this, 'PATCH', '/security/ssh', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== AUDIT ==========
				else if (resource === 'audit') {
					if (operation === 'get') {
						responseData = await ontapApiRequest.call(this, 'GET', '/security/audit', {}, qs);
					} else if (operation === 'update') {
						const updateFields = this.getNodeParameter('auditUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.cliGet !== undefined) body.cli = { get: updateFields.cliGet };
						if (updateFields.httpGet !== undefined) body.http = { get: updateFields.httpGet };
						if (updateFields.ontapiGet !== undefined) body.ontapi = { get: updateFields.ontapiGet };

						const response = await ontapApiRequest.call(this, 'PATCH', '/security/audit', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== LOGIN MESSAGES ==========
				else if (resource === 'loginMessages') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}

						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/security/login/messages', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/security/login/messages', {}, qs);
						}
					} else if (operation === 'get') {
						const svmLocator = this.getNodeParameter('loginMessagesSvm', i) as { mode: string; value: string };
						responseData = await ontapApiRequest.call(this, 'GET', `/security/login/messages/${svmLocator.value}`, {}, qs);
					} else if (operation === 'update') {
						const svmLocator = this.getNodeParameter('loginMessagesSvm', i) as { mode: string; value: string };
						const updateFields = this.getNodeParameter('loginMessagesUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.banner !== undefined) body.banner = updateFields.banner;
						if (updateFields.message !== undefined) body.message = updateFields.message;
						if (updateFields.showClusterMessage !== undefined) {
							body.show_cluster_message = updateFields.showClusterMessage;
						}

						const response = await ontapApiRequest.call(this, 'PATCH', `/security/login/messages/${svmLocator.value}`, cleanObject(body));
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
