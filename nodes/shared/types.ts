import type { IDataObject } from 'n8n-workflow';

/**
 * ONTAP API credentials structure (auth only, host is in node parameters)
 */
export interface OntapCredentials {
	username: string;
	password: string;
	allowUnauthorizedCerts: boolean;
}

/**
 * Standard ONTAP API response structure with HAL links
 */
export interface OntapApiResponse extends IDataObject {
	records?: IDataObject[];
	num_records?: number;
	_links?: {
		self?: { href: string };
		next?: { href: string };
	};
	job?: OntapJob;
}

/**
 * ONTAP Job structure
 */
export interface OntapJob extends IDataObject {
	uuid: string;
	state: 'queued' | 'running' | 'paused' | 'success' | 'failure';
	message?: string;
	description?: string;
	start_time?: string;
	end_time?: string;
	code?: number;
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP Cluster information
 */
export interface OntapCluster {
	uuid: string;
	name: string;
	version?: {
		full: string;
		generation: number;
		major: number;
		minor: number;
	};
	contact?: string;
	location?: string;
	dns_domains?: string[];
	name_servers?: string[];
	management_interfaces?: OntapNetworkInterface[];
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP Node information
 */
export interface OntapNode {
	uuid: string;
	name: string;
	model?: string;
	serial_number?: string;
	location?: string;
	uptime?: number;
	state?: string;
	membership?: string;
	ha?: {
		enabled: boolean;
		partner?: {
			name: string;
			uuid: string;
		};
	};
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP SVM (Storage Virtual Machine) structure
 */
export interface OntapSvm {
	uuid: string;
	name: string;
	state?: string;
	subtype?: string;
	language?: string;
	comment?: string;
	ipspace?: {
		name: string;
		uuid: string;
	};
	aggregates?: Array<{
		name: string;
		uuid: string;
	}>;
	cifs?: {
		enabled: boolean;
		name?: string;
	};
	nfs?: {
		enabled: boolean;
	};
	iscsi?: {
		enabled: boolean;
	};
	fcp?: {
		enabled: boolean;
	};
	nvme?: {
		enabled: boolean;
	};
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP Volume structure
 */
export interface OntapVolume {
	uuid: string;
	name: string;
	svm?: {
		name: string;
		uuid: string;
	};
	aggregates?: Array<{
		name: string;
		uuid: string;
	}>;
	state?: string;
	type?: string;
	style?: string;
	size?: number;
	space?: {
		size: number;
		available: number;
		used: number;
		snapshot?: {
			used: number;
			reserve_percent: number;
		};
	};
	nas?: {
		path?: string;
		export_policy?: {
			name: string;
		};
		security_style?: string;
	};
	snapshot_policy?: {
		name: string;
		uuid: string;
	};
	autosize?: {
		mode?: string;
		maximum?: number;
		minimum?: number;
		grow_threshold?: number;
		shrink_threshold?: number;
	};
	guarantee?: {
		type: string;
		honored: boolean;
	};
	comment?: string;
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP Aggregate structure
 */
export interface OntapAggregate {
	uuid: string;
	name: string;
	node?: {
		name: string;
		uuid: string;
	};
	state?: string;
	space?: {
		block_storage: {
			size: number;
			available: number;
			used: number;
		};
		efficiency?: {
			savings: number;
			ratio: number;
		};
	};
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP Snapshot structure
 */
export interface OntapSnapshot {
	uuid: string;
	name: string;
	volume?: {
		name: string;
		uuid: string;
	};
	svm?: {
		name: string;
		uuid: string;
	};
	create_time?: string;
	expiry_time?: string;
	size?: number;
	state?: string;
	comment?: string;
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP Network Interface structure
 */
export interface OntapNetworkInterface {
	uuid: string;
	name: string;
	ip?: {
		address: string;
		netmask: string;
		family: string;
	};
	svm?: {
		name: string;
		uuid: string;
	};
	location?: {
		home_node?: {
			name: string;
			uuid: string;
		};
		home_port?: {
			name: string;
			uuid: string;
			node: { name: string };
		};
		is_home?: boolean;
	};
	state?: string;
	enabled?: boolean;
	service_policy?: {
		name: string;
	};
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP LUN structure
 */
export interface OntapLun {
	uuid: string;
	name: string;
	svm?: {
		name: string;
		uuid: string;
	};
	location?: {
		volume?: {
			name: string;
			uuid: string;
		};
		logical_unit?: string;
	};
	os_type?: string;
	serial_number?: string;
	space?: {
		size: number;
		used: number;
		guarantee?: {
			requested: boolean;
			reserved: boolean;
		};
	};
	status?: {
		state: string;
		container_state: string;
		mapped: boolean;
	};
	comment?: string;
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP Igroup structure
 */
export interface OntapIgroup {
	uuid: string;
	name: string;
	svm?: {
		name: string;
		uuid: string;
	};
	protocol?: string;
	os_type?: string;
	initiators?: Array<{
		name: string;
		comment?: string;
	}>;
	lun_maps?: Array<{
		lun: {
			name: string;
			uuid: string;
		};
		logical_unit_number: number;
	}>;
	comment?: string;
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP Export Policy structure
 */
export interface OntapExportPolicy {
	id: number;
	name: string;
	svm?: {
		name: string;
		uuid: string;
	};
	rules?: Array<{
		index: number;
		clients: Array<{ match: string }>;
		protocols: string[];
		ro_rule: string[];
		rw_rule: string[];
		superuser: string[];
		anonymous_user?: string;
	}>;
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP CIFS Share structure
 */
export interface OntapCifsShare {
	name: string;
	svm?: {
		name: string;
		uuid: string;
	};
	path?: string;
	comment?: string;
	home_directory?: boolean;
	oplocks?: boolean;
	access_based_enumeration?: boolean;
	change_notify?: boolean;
	encryption?: boolean;
	unix_symlink?: string;
	acls?: Array<{
		user_or_group: string;
		permission: string;
		type: string;
	}>;
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP SnapMirror Relationship structure
 */
export interface OntapSnapMirrorRelationship {
	uuid: string;
	source?: {
		path: string;
		svm?: {
			name: string;
			uuid: string;
		};
		cluster?: {
			name: string;
			uuid: string;
		};
	};
	destination?: {
		path: string;
		svm?: {
			name: string;
			uuid: string;
		};
	};
	state?: string;
	healthy?: boolean;
	policy?: {
		name: string;
		uuid: string;
		type: string;
	};
	transfer?: {
		state: string;
		bytes_transferred: number;
		end_time?: string;
	};
	lag_time?: string;
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP Security Account structure
 */
export interface OntapSecurityAccount {
	name: string;
	owner?: {
		name: string;
		uuid: string;
	};
	scope?: string;
	locked?: boolean;
	role?: {
		name: string;
	};
	applications?: Array<{
		application: string;
		authentication_methods: string[];
		second_authentication_method?: string;
	}>;
	comment?: string;
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP Qtree structure
 */
export interface OntapQtree {
	id: number;
	name: string;
	volume?: {
		name: string;
		uuid: string;
	};
	svm?: {
		name: string;
		uuid: string;
	};
	security_style?: string;
	unix_permissions?: number;
	export_policy?: {
		name: string;
		id: number;
	};
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP License structure
 */
export interface OntapLicense {
	name: string;
	scope?: string;
	state?: string;
	licenses?: Array<{
		serial_number: string;
		owner?: string;
		compliance?: {
			state: string;
		};
		active?: boolean;
		evaluation?: boolean;
		installed_license?: string;
	}>;
	_links?: {
		self?: { href: string };
	};
}

/**
 * ONTAP EMS Event structure
 */
export interface OntapEmsEvent {
	index: number;
	time: string;
	node?: {
		name: string;
		uuid: string;
	};
	message?: {
		severity: string;
		name: string;
	};
	log_message?: string;
	parameters?: Array<{
		name: string;
		value: string;
	}>;
	_links?: {
		self?: { href: string };
	};
}

/**
 * Common options for list operations
 */
export interface OntapListOptions {
	maxRecords?: number;
	returnTimeout?: number;
	fields?: string[];
	orderBy?: string[];
}

/**
 * SVM name and UUID reference (commonly used in nested objects)
 */
export interface OntapSvmRef {
	name: string;
	uuid?: string;
}

/**
 * Volume name and UUID reference
 */
export interface OntapVolumeRef {
	name: string;
	uuid?: string;
}

/**
 * Node name and UUID reference
 */
export interface OntapNodeRef {
	name: string;
	uuid?: string;
}

/**
 * Aggregate name and UUID reference
 */
export interface OntapAggregateRef {
	name: string;
	uuid?: string;
}
