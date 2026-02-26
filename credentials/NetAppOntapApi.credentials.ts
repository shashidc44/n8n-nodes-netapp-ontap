import type {
	IAuthenticateGeneric,
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

	// Note: Credential test is performed via the cluster host specified in the node
}
