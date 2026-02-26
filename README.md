# n8n-nodes-netapp-ontap

This package contains n8n community nodes for NetApp ONTAP REST API operations, covering comprehensive storage management capabilities targeting ONTAP 9.12+.

## Installation

```bash
# In your n8n installation directory
npm install n8n-nodes-netapp-ontap
```

## Nodes

### NetApp ONTAP Cluster
Manage cluster-level settings:
- **Cluster**: Get/update cluster configuration
- **Node**: List nodes, get node details
- **License**: Add/delete/list licenses
- **Job**: Monitor/cancel async jobs
- **Schedule**: Create/manage job schedules

### NetApp ONTAP SVM
Manage Storage Virtual Machines:
- **SVM**: Full CRUD, start/stop operations
- **SVM Peer**: Manage SVM peering relationships

### NetApp ONTAP Storage
Comprehensive storage management:
- **Volume**: Create/clone/move/resize, mount/unmount, online/offline
- **Aggregate**: Create/delete, add disks, online/offline
- **Snapshot**: Create/delete/restore snapshots
- **Qtree**: Create/manage qtrees
- **Quota**: Configure quota rules and policies
- **Disk**: List disks, assign to aggregates

### NetApp ONTAP Network
Network configuration:
- **IP Interface**: Create/manage network interfaces (LIFs)
- **Port**: Configure physical/LAG ports
- **Broadcast Domain**: Manage broadcast domains
- **IPspace**: Create/manage IPspaces
- **Route**: Configure network routes

### NetApp ONTAP SAN
SAN/Block storage operations:
- **LUN**: Create/clone/resize, online/offline
- **Igroup**: Manage initiator groups, add/remove initiators
- **LUN Map**: Map/unmap LUNs to igroups
- **FC Interface**: Create/manage Fibre Channel interfaces
- **FCP Service**: Enable/disable FCP per SVM
- **iSCSI Service**: Enable/disable iSCSI per SVM

### NetApp ONTAP NAS
NAS/File services:
- **CIFS Share**: Create/manage SMB shares
- **CIFS Service**: Configure CIFS/SMB with AD integration
- **CIFS Session**: Monitor/terminate sessions
- **NFS Service**: Configure NFSv3/v4/v4.1
- **Export Policy**: Create NFS export policies
- **Export Rule**: Configure export rules

### NetApp ONTAP SnapMirror
Data protection and replication:
- **Relationship**: Create/initialize/update/break/resync/restore
- **Transfer**: Start/abort/monitor transfers
- **Policy**: Create/manage SnapMirror policies

### NetApp ONTAP Security
Security and access management:
- **Account**: Create/manage user accounts, lock/unlock, set passwords
- **Role**: Create roles, add/remove privileges
- **Certificate**: Self-signed, CSR, install CA-signed, sign with CA
- **Key Manager**: Onboard and external (KMIP) key management
- **SSH**: Configure SSH server settings
- **Audit**: Configure audit logging
- **Login Messages**: Set banner and MOTD

## Credentials

Configure NetApp ONTAP API credentials with:
- **Username**: API username (typically `admin`)
- **Password**: API password
- **Ignore SSL Certificate Issues**: Skip TLS verification (for self-signed certificates)
- **Test Cluster Host** *(optional)*: A cluster hostname used only to verify credentials via the "Test" button
- **Test Cluster Port** *(optional)*: Port for the test connection (default: 443)

> **Note:** Credentials are reusable across multiple clusters. The actual cluster host and port are specified in each node, not in the credential.

## Features

- **Async Operation Handling**: Automatic polling for long-running operations
- **Pagination**: Automatic handling of large result sets via HAL links
- **Resource Locators**: Specify resources by UUID or Name
- **Comprehensive Error Handling**: Detailed error messages from ONTAP API
- **Continue on Fail**: Support for batch operations with error tolerance

## Requirements

- n8n version 1.0.0 or later
- NetApp ONTAP 9.12 or later
- REST API access enabled on ONTAP cluster

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
