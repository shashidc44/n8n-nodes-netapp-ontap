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

export class NetAppOntapNetwork implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NetApp ONTAP Network',
		name: 'netAppOntapNetwork',
		icon: 'file:netapp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage NetApp ONTAP network interfaces, ports, broadcast domains, and routing',
		defaults: {
			name: 'ONTAP Network',
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
						name: 'Broadcast Domain',
						value: 'broadcastDomain',
						description: 'Manage broadcast domains',
					},
					{
						name: 'IP Interface',
						value: 'ipInterface',
						description: 'Manage IP interfaces (LIFs)',
					},
					{
						name: 'IPspace',
						value: 'ipspace',
						description: 'Manage IPspaces',
					},
					{
						name: 'Port',
						value: 'port',
						description: 'Manage network ports',
					},
					{
						name: 'Route',
						value: 'route',
						description: 'Manage network routes',
					},
				],
				default: 'ipInterface',
			},

			// ===================
			// IP INTERFACE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['ipInterface'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new IP interface',
						action: 'Create IP interface',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an IP interface',
						action: 'Delete IP interface',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get IP interface details',
						action: 'Get IP interface',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all IP interfaces',
						action: 'Get many IP interfaces',
					},
					{
						name: 'Migrate',
						value: 'migrate',
						description: 'Migrate IP interface to another port',
						action: 'Migrate IP interface',
					},
					{
						name: 'Revert',
						value: 'revert',
						description: 'Revert IP interface to home port',
						action: 'Revert IP interface',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update IP interface settings',
						action: 'Update IP interface',
					},
				],
				default: 'getMany',
			},

			// IP Interface Selection
			{
				displayName: 'IP Interface',
				name: 'ipInterfaceId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['ipInterface'],
						operation: ['get', 'update', 'delete', 'migrate', 'revert'],
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

			// IP Interface Create Fields
			{
				displayName: 'Name',
				name: 'ipInterfaceName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['ipInterface'],
						operation: ['create'],
					},
				},
				description: 'Name of the IP interface',
			},
			{
				displayName: 'SVM',
				name: 'ipInterfaceSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['ipInterface'],
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
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['ipInterface'],
						operation: ['create'],
					},
				},
				placeholder: '192.168.1.100',
			},
			{
				displayName: 'Netmask',
				name: 'netmask',
				type: 'number',
				default: 24,
				required: true,
				displayOptions: {
					show: {
						resource: ['ipInterface'],
						operation: ['create'],
					},
				},
				description: 'Netmask in CIDR notation (e.g., 24 for /24)',
			},
			{
				displayName: 'Home Node',
				name: 'homeNode',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['ipInterface'],
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
				name: 'homePort',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['ipInterface'],
						operation: ['create'],
					},
				},
				placeholder: 'e0a',
				description: 'Home port name (e.g., e0a, a0a)',
			},

			// IP Interface Create Options
			{
				displayName: 'Additional Options',
				name: 'ipInterfaceCreateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['ipInterface'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Service Policy',
						name: 'servicePolicy',
						type: 'string',
						default: '',
						placeholder: 'default-data-files',
						description: 'Service policy name',
					},
					{
						displayName: 'IPspace',
						name: 'ipspace',
						type: 'string',
						default: 'Default',
						description: 'IPspace name',
					},
					{
						displayName: 'Auto Revert',
						name: 'autoRevert',
						type: 'boolean',
						default: true,
						description: 'Whether to automatically revert to home port',
					},
					{
						displayName: 'Failover Policy',
						name: 'failoverPolicy',
						type: 'options',
						options: [
							{ name: 'Local Only', value: 'local_only' },
							{ name: 'SFO Partner Only', value: 'sfo_partner_only' },
							{ name: 'Disabled', value: 'disabled' },
							{ name: 'System Defined', value: 'system_defined' },
							{ name: 'Broadcast Domain Wide', value: 'broadcast_domain_wide' },
						],
						default: 'system_defined',
					},
					{
						displayName: 'DNS Zone',
						name: 'dnsZone',
						type: 'string',
						default: '',
						description: 'DNS zone for dynamic DNS registration',
					},
					{
						displayName: 'DDNS Enabled',
						name: 'ddnsEnabled',
						type: 'boolean',
						default: false,
						description: 'Whether to enable dynamic DNS',
					},
				],
			},

			// IP Interface Migrate Fields
			{
				displayName: 'Destination Node',
				name: 'destNode',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['ipInterface'],
						operation: ['migrate'],
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
				displayName: 'Destination Port',
				name: 'destPort',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['ipInterface'],
						operation: ['migrate'],
					},
				},
				placeholder: 'e0b',
			},

			// IP Interface Update Fields
			{
				displayName: 'Update Fields',
				name: 'ipInterfaceUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['ipInterface'],
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
						displayName: 'Auto Revert',
						name: 'autoRevert',
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Failover Policy',
						name: 'failoverPolicy',
						type: 'options',
						options: [
							{ name: 'Local Only', value: 'local_only' },
							{ name: 'SFO Partner Only', value: 'sfo_partner_only' },
							{ name: 'Disabled', value: 'disabled' },
							{ name: 'System Defined', value: 'system_defined' },
							{ name: 'Broadcast Domain Wide', value: 'broadcast_domain_wide' },
						],
						default: 'system_defined',
					},
					{
						displayName: 'Service Policy',
						name: 'servicePolicy',
						type: 'string',
						default: '',
					},
				],
			},

			// ===================
			// PORT OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['port'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get port details',
						action: 'Get port',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all ports',
						action: 'Get many ports',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update port settings',
						action: 'Update port',
					},
				],
				default: 'getMany',
			},

			// Port Selection
			{
				displayName: 'Port',
				name: 'portId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['port'],
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

			// Port Update Fields
			{
				displayName: 'Update Fields',
				name: 'portUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['port'],
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
						displayName: 'Speed',
						name: 'speed',
						type: 'options',
						options: [
							{ name: 'Auto', value: 'auto' },
							{ name: '10 MB', value: '10' },
							{ name: '100 MB', value: '100' },
							{ name: '1 GB', value: '1000' },
							{ name: '10 GB', value: '10000' },
							{ name: '25 GB', value: '25000' },
							{ name: '40 GB', value: '40000' },
							{ name: '100 GB', value: '100000' },
						],
						default: 'auto',
					},
					{
						displayName: 'MTU',
						name: 'mtu',
						type: 'number',
						default: 1500,
					},
					{
						displayName: 'Flow Control',
						name: 'flowControl',
						type: 'options',
						options: [
							{ name: 'None', value: 'none' },
							{ name: 'Receive', value: 'receive' },
							{ name: 'Send', value: 'send' },
							{ name: 'Full', value: 'full' },
						],
						default: 'full',
					},
				],
			},

			// ===================
			// BROADCAST DOMAIN OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['broadcastDomain'],
					},
				},
				options: [
					{
						name: 'Add Ports',
						value: 'addPorts',
						description: 'Add ports to broadcast domain',
						action: 'Add ports to broadcast domain',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new broadcast domain',
						action: 'Create broadcast domain',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a broadcast domain',
						action: 'Delete broadcast domain',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get broadcast domain details',
						action: 'Get broadcast domain',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all broadcast domains',
						action: 'Get many broadcast domains',
					},
					{
						name: 'Remove Ports',
						value: 'removePorts',
						description: 'Remove ports from broadcast domain',
						action: 'Remove ports from broadcast domain',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update broadcast domain settings',
						action: 'Update broadcast domain',
					},
				],
				default: 'getMany',
			},

			// Broadcast Domain Selection
			{
				displayName: 'Broadcast Domain',
				name: 'broadcastDomainId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['broadcastDomain'],
						operation: ['get', 'update', 'delete', 'addPorts', 'removePorts'],
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

			// Broadcast Domain Create Fields
			{
				displayName: 'Name',
				name: 'broadcastDomainName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['broadcastDomain'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'MTU',
				name: 'broadcastDomainMtu',
				type: 'number',
				default: 1500,
				required: true,
				displayOptions: {
					show: {
						resource: ['broadcastDomain'],
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'IPspace',
				name: 'broadcastDomainIpspace',
				type: 'string',
				default: 'Default',
				displayOptions: {
					show: {
						resource: ['broadcastDomain'],
						operation: ['create'],
					},
				},
			},

			// Broadcast Domain Ports
			{
				displayName: 'Ports',
				name: 'broadcastDomainPorts',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['broadcastDomain'],
						operation: ['addPorts', 'removePorts'],
					},
				},
				placeholder: 'node1:e0a,node1:e0b',
				description: 'Comma-separated list of node:port pairs',
			},

			// Broadcast Domain Update
			{
				displayName: 'Update Fields',
				name: 'broadcastDomainUpdateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['broadcastDomain'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'MTU',
						name: 'mtu',
						type: 'number',
						default: 1500,
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
			// IPSPACE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['ipspace'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new IPspace',
						action: 'Create IPspace',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an IPspace',
						action: 'Delete IPspace',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get IPspace details',
						action: 'Get IPspace',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all IPspaces',
						action: 'Get many IPspaces',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update IPspace settings',
						action: 'Update IPspace',
					},
				],
				default: 'getMany',
			},

			// IPspace Selection
			{
				displayName: 'IPspace',
				name: 'ipspaceId',
				type: 'resourceLocator',
				default: { mode: 'uuid', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['ipspace'],
						operation: ['get', 'update', 'delete'],
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

			// IPspace Create Fields
			{
				displayName: 'Name',
				name: 'ipspaceName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['ipspace'],
						operation: ['create'],
					},
				},
			},

			// IPspace Update
			{
				displayName: 'New Name',
				name: 'ipspaceNewName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['ipspace'],
						operation: ['update'],
					},
				},
			},

			// ===================
			// ROUTE OPERATIONS
			// ===================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['route'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new route',
						action: 'Create route',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a route',
						action: 'Delete route',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get route details',
						action: 'Get route',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get all routes',
						action: 'Get many routes',
					},
				],
				default: 'getMany',
			},

			// Route Selection
			{
				displayName: 'Route UUID',
				name: 'routeId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['route'],
						operation: ['get', 'delete'],
					},
				},
			},

			// Route Create Fields
			{
				displayName: 'SVM',
				name: 'routeSvm',
				type: 'resourceLocator',
				default: { mode: 'name', value: '' },
				required: true,
				displayOptions: {
					show: {
						resource: ['route'],
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
				displayName: 'Destination',
				name: 'routeDestination',
				type: 'string',
				default: '0.0.0.0/0',
				required: true,
				displayOptions: {
					show: {
						resource: ['route'],
						operation: ['create'],
					},
				},
				placeholder: '0.0.0.0/0',
				description: 'Destination network in CIDR notation',
			},
			{
				displayName: 'Gateway',
				name: 'routeGateway',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['route'],
						operation: ['create'],
					},
				},
				placeholder: '192.168.1.1',
				description: 'Gateway IP address',
			},
			{
				displayName: 'Metric',
				name: 'routeMetric',
				type: 'number',
				default: 20,
				displayOptions: {
					show: {
						resource: ['route'],
						operation: ['create'],
					},
				},
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

				// Helper to resolve IP interface
				const resolveIpInterfaceId = async (locator: { mode: string; value: string }): Promise<string> => {
					if (locator.mode === 'uuid' || locator.mode === 'list') {
						return locator.value;
					}
					const interfaces = await ontapApiRequestAllItems.call(this, 'GET', '/network/ip/interfaces', {}, { name: locator.value });
					if (interfaces.length === 0) {
						throw new Error(`IP interface "${locator.value}" not found`);
					}
					return interfaces[0].uuid as string;
				};

				// Helper to resolve broadcast domain
				const resolveBroadcastDomainId = async (locator: { mode: string; value: string }): Promise<string> => {
					if (locator.mode === 'uuid' || locator.mode === 'list') {
						return locator.value;
					}
					const domains = await ontapApiRequestAllItems.call(this, 'GET', '/network/ethernet/broadcast-domains', {}, { name: locator.value });
					if (domains.length === 0) {
						throw new Error(`Broadcast domain "${locator.value}" not found`);
					}
					return domains[0].uuid as string;
				};

				// Helper to resolve IPspace
				const resolveIpspaceId = async (locator: { mode: string; value: string }): Promise<string> => {
					if (locator.mode === 'uuid' || locator.mode === 'list') {
						return locator.value;
					}
					const ipspaces = await ontapApiRequestAllItems.call(this, 'GET', '/network/ipspaces', {}, { name: locator.value });
					if (ipspaces.length === 0) {
						throw new Error(`IPspace "${locator.value}" not found`);
					}
					return ipspaces[0].uuid as string;
				};

				// ========== IP INTERFACE ==========
				if (resource === 'ipInterface') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/network/ip/interfaces', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/network/ip/interfaces', {}, qs);
						}
					} else if (operation === 'get') {
						const locator = this.getNodeParameter('ipInterfaceId', i) as { mode: string; value: string };
						const interfaceId = await resolveIpInterfaceId(locator);
						responseData = await ontapApiRequest.call(this, 'GET', `/network/ip/interfaces/${interfaceId}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('ipInterfaceName', i) as string;
						const svmLocator = this.getNodeParameter('ipInterfaceSvm', i) as { mode: string; value: string };
						const ipAddress = this.getNodeParameter('ipAddress', i) as string;
						const netmask = this.getNodeParameter('netmask', i) as number;
						const homeNodeLocator = this.getNodeParameter('homeNode', i) as { mode: string; value: string };
						const homePort = this.getNodeParameter('homePort', i) as string;
						const createOptions = this.getNodeParameter('ipInterfaceCreateOptions', i, {}) as IDataObject;

						const body: IDataObject = {
							name,
							svm: { name: svmLocator.value },
							ip: {
								address: ipAddress,
								netmask: netmask,
							},
							location: {
								home_node: { name: homeNodeLocator.value },
								home_port: { name: homePort },
							},
						};

						if (createOptions.servicePolicy) {
							body.service_policy = { name: createOptions.servicePolicy };
						}
						if (createOptions.ipspace) {
							body.ipspace = { name: createOptions.ipspace };
						}
						if (createOptions.autoRevert !== undefined) {
							body.location = body.location || {};
							(body.location as IDataObject).auto_revert = createOptions.autoRevert;
						}
						if (createOptions.failoverPolicy) {
							body.location = body.location || {};
							(body.location as IDataObject).failover = createOptions.failoverPolicy;
						}
						if (createOptions.ddnsEnabled !== undefined || createOptions.dnsZone) {
							body.ddns = {
								enabled: createOptions.ddnsEnabled || false,
							};
							if (createOptions.dnsZone) {
								(body.ddns as IDataObject).zone = createOptions.dnsZone;
							}
						}

						const response = await ontapApiRequest.call(this, 'POST', '/network/ip/interfaces', cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const locator = this.getNodeParameter('ipInterfaceId', i) as { mode: string; value: string };
						const interfaceId = await resolveIpInterfaceId(locator);
						const updateFields = this.getNodeParameter('ipInterfaceUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.enabled !== undefined) body.enabled = updateFields.enabled;
						if (updateFields.servicePolicy) body.service_policy = { name: updateFields.servicePolicy };
						
						if (updateFields.autoRevert !== undefined || updateFields.failoverPolicy) {
							body.location = {};
							if (updateFields.autoRevert !== undefined) {
								(body.location as IDataObject).auto_revert = updateFields.autoRevert;
							}
							if (updateFields.failoverPolicy) {
								(body.location as IDataObject).failover = updateFields.failoverPolicy;
							}
						}

						const response = await ontapApiRequest.call(this, 'PATCH', `/network/ip/interfaces/${interfaceId}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const locator = this.getNodeParameter('ipInterfaceId', i) as { mode: string; value: string };
						const interfaceId = await resolveIpInterfaceId(locator);

						const response = await ontapApiRequest.call(this, 'DELETE', `/network/ip/interfaces/${interfaceId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: interfaceId };
						}
					} else if (operation === 'migrate') {
						const locator = this.getNodeParameter('ipInterfaceId', i) as { mode: string; value: string };
						const interfaceId = await resolveIpInterfaceId(locator);
						const destNodeLocator = this.getNodeParameter('destNode', i) as { mode: string; value: string };
						const destPort = this.getNodeParameter('destPort', i) as string;

						const response = await ontapApiRequest.call(this, 'PATCH', `/network/ip/interfaces/${interfaceId}`, {
							location: {
								node: { name: destNodeLocator.value },
								port: { name: destPort },
							},
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'revert') {
						const locator = this.getNodeParameter('ipInterfaceId', i) as { mode: string; value: string };
						const interfaceId = await resolveIpInterfaceId(locator);

						const response = await ontapApiRequest.call(this, 'PATCH', `/network/ip/interfaces/${interfaceId}`, {
							location: {
								is_home: true,
							},
						});
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== PORT ==========
				else if (resource === 'port') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/network/ethernet/ports', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/network/ethernet/ports', {}, qs);
						}
					} else if (operation === 'get') {
						const locator = this.getNodeParameter('portId', i) as { mode: string; value: string };
						responseData = await ontapApiRequest.call(this, 'GET', `/network/ethernet/ports/${locator.value}`, {}, qs);
					} else if (operation === 'update') {
						const locator = this.getNodeParameter('portId', i) as { mode: string; value: string };
						const updateFields = this.getNodeParameter('portUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.enabled !== undefined) body.enabled = updateFields.enabled;
						if (updateFields.mtu) body.mtu = updateFields.mtu;
						if (updateFields.speed) body.speed = updateFields.speed;
						if (updateFields.flowControl) body.flow_control = updateFields.flowControl;

						const response = await ontapApiRequest.call(this, 'PATCH', `/network/ethernet/ports/${locator.value}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== BROADCAST DOMAIN ==========
				else if (resource === 'broadcastDomain') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/network/ethernet/broadcast-domains', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/network/ethernet/broadcast-domains', {}, qs);
						}
					} else if (operation === 'get') {
						const locator = this.getNodeParameter('broadcastDomainId', i) as { mode: string; value: string };
						const domainId = await resolveBroadcastDomainId(locator);
						responseData = await ontapApiRequest.call(this, 'GET', `/network/ethernet/broadcast-domains/${domainId}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('broadcastDomainName', i) as string;
						const mtu = this.getNodeParameter('broadcastDomainMtu', i) as number;
						const ipspace = this.getNodeParameter('broadcastDomainIpspace', i) as string;

						const body: IDataObject = {
							name,
							mtu,
							ipspace: { name: ipspace },
						};

						const response = await ontapApiRequest.call(this, 'POST', '/network/ethernet/broadcast-domains', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const locator = this.getNodeParameter('broadcastDomainId', i) as { mode: string; value: string };
						const domainId = await resolveBroadcastDomainId(locator);
						const updateFields = this.getNodeParameter('broadcastDomainUpdateFields', i) as IDataObject;

						const body: IDataObject = {};
						if (updateFields.mtu) body.mtu = updateFields.mtu;
						if (updateFields.name) body.name = updateFields.name;

						const response = await ontapApiRequest.call(this, 'PATCH', `/network/ethernet/broadcast-domains/${domainId}`, cleanObject(body));
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const locator = this.getNodeParameter('broadcastDomainId', i) as { mode: string; value: string };
						const domainId = await resolveBroadcastDomainId(locator);

						const response = await ontapApiRequest.call(this, 'DELETE', `/network/ethernet/broadcast-domains/${domainId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: domainId };
						}
					} else if (operation === 'addPorts') {
						const locator = this.getNodeParameter('broadcastDomainId', i) as { mode: string; value: string };
						const domainId = await resolveBroadcastDomainId(locator);
						const portsStr = this.getNodeParameter('broadcastDomainPorts', i) as string;
						
						const ports = portsStr.split(',').map((p) => {
							const [node, port] = p.trim().split(':');
							return { node: { name: node }, name: port };
						});

						const response = await ontapApiRequest.call(this, 'PATCH', `/network/ethernet/broadcast-domains/${domainId}`, {
							ports,
						});
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'removePorts') {
						const locator = this.getNodeParameter('broadcastDomainId', i) as { mode: string; value: string };
						const domainId = await resolveBroadcastDomainId(locator);
						const portsStr = this.getNodeParameter('broadcastDomainPorts', i) as string;
						
						// Get current ports
						const domain = await ontapApiRequest.call(this, 'GET', `/network/ethernet/broadcast-domains/${domainId}`, {}, { fields: 'ports' }) as IDataObject;
						const currentPorts = (domain.ports as IDataObject[]) || [];
						
						const portsToRemove = portsStr.split(',').map((p) => p.trim());
						const remainingPorts = currentPorts.filter((p) => {
							const portName = `${(p.node as IDataObject).name}:${p.name}`;
							return !portsToRemove.includes(portName);
						});

						const response = await ontapApiRequest.call(this, 'PATCH', `/network/ethernet/broadcast-domains/${domainId}`, {
							ports: remainingPorts,
						});
						responseData = await handleAsyncResponse.call(this, response);
					}
				}

				// ========== IPSPACE ==========
				else if (resource === 'ipspace') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/network/ipspaces', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/network/ipspaces', {}, qs);
						}
					} else if (operation === 'get') {
						const locator = this.getNodeParameter('ipspaceId', i) as { mode: string; value: string };
						const ipspaceId = await resolveIpspaceId(locator);
						responseData = await ontapApiRequest.call(this, 'GET', `/network/ipspaces/${ipspaceId}`, {}, qs);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('ipspaceName', i) as string;

						const response = await ontapApiRequest.call(this, 'POST', '/network/ipspaces', { name });
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'update') {
						const locator = this.getNodeParameter('ipspaceId', i) as { mode: string; value: string };
						const ipspaceId = await resolveIpspaceId(locator);
						const newName = this.getNodeParameter('ipspaceNewName', i) as string;

						const response = await ontapApiRequest.call(this, 'PATCH', `/network/ipspaces/${ipspaceId}`, { name: newName });
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const locator = this.getNodeParameter('ipspaceId', i) as { mode: string; value: string };
						const ipspaceId = await resolveIpspaceId(locator);

						const response = await ontapApiRequest.call(this, 'DELETE', `/network/ipspaces/${ipspaceId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: ipspaceId };
						}
					}
				}

				// ========== ROUTE ==========
				else if (resource === 'route') {
					if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
						
						// Apply API filters
						if (filters.apiFilters) {
							Object.assign(qs, parseApiFilters(filters.apiFilters as string));
						}
						
						if (filters.returnAll === false) {
							qs.max_records = filters.limit || 50;
							const response = await ontapApiRequest.call(this, 'GET', '/network/ip/routes', {}, qs);
							responseData = (response.records as IDataObject[]) || [];
						} else {
							responseData = await ontapApiRequestAllItems.call(this, 'GET', '/network/ip/routes', {}, qs);
						}
					} else if (operation === 'get') {
						const routeId = this.getNodeParameter('routeId', i) as string;
						responseData = await ontapApiRequest.call(this, 'GET', `/network/ip/routes/${routeId}`, {}, qs);
					} else if (operation === 'create') {
						const svmLocator = this.getNodeParameter('routeSvm', i) as { mode: string; value: string };
						const destination = this.getNodeParameter('routeDestination', i) as string;
						const gateway = this.getNodeParameter('routeGateway', i) as string;
						const metric = this.getNodeParameter('routeMetric', i) as number;

						const [destAddress, destNetmask] = destination.split('/');
						const body: IDataObject = {
							svm: { name: svmLocator.value },
							destination: {
								address: destAddress,
								netmask: destNetmask || '0',
							},
							gateway,
							metric,
						};

						const response = await ontapApiRequest.call(this, 'POST', '/network/ip/routes', body);
						responseData = await handleAsyncResponse.call(this, response);
					} else if (operation === 'delete') {
						const routeId = this.getNodeParameter('routeId', i) as string;

						const response = await ontapApiRequest.call(this, 'DELETE', `/network/ip/routes/${routeId}`);
						responseData = await handleAsyncResponse.call(this, response);
						if (!responseData.job) {
							responseData = { success: true, deleted: routeId };
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
