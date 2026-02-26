import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class NetAppOntapApi implements ICredentialType {
	name = 'netAppOntapApi';
	displayName = 'NetApp ONTAP API';
	documentationUrl = 'https://docs.netapp.com/us-en/ontap-automation/';
	icon = 'file:netapp.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			placeholder: 'admin',
			description: 'Username for ONTAP REST API authentication',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Password for ONTAP REST API authentication',
			required: true,
		},
		{
			displayName: 'Ignore SSL Certificate Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description: 'Whether to connect even if the SSL certificate is invalid (e.g., self-signed certificates)',
		},
		{
			displayName: 'Test Cluster Host',
			name: 'clusterHost',
			type: 'string',
			default: '',
			placeholder: 'cluster.example.com',
			description: 'Enter a cluster hostname to verify your credentials. This is only used for testing — the actual cluster is specified in each node.',
		},
		{
			displayName: 'Test Cluster Port',
			name: 'clusterPort',
			type: 'number',
			default: 443,
			description: 'Port for the test connection',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.clusterHost}}:{{$credentials.clusterPort}}',
			url: '/api/cluster',
			skipSslCertificateValidation: '={{$credentials.allowUnauthorizedCerts}}',
		},
	};
}
