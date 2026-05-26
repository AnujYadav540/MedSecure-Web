# MedSecure: Blockchain-Based Medical Record Vault

A secure, decentralized platform for managing medical records using blockchain technology. Patients can upload encrypted medical files and share access with trusted doctors via smart contracts.

## 🚀 Features

- **Secure File Storage**: Encrypted medical records stored on IPFS
- **Blockchain-Based Access Control**: Smart contracts manage permissions
- **Role-Based Access**: Separate interfaces for patients, doctors, and admins
- **MetaMask Integration**: Secure blockchain transactions
- **Audit Trail**: Complete access history via blockchain

## 🛠️ Tech Stack

- **Frontend**: React.js + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **Blockchain**: Polygon Network
- **Smart Contracts**: Solidity
- **File Storage**: IPFS
- **Authentication**: JWT + MetaMask
- **File Encryption**: AES-256

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/medsecure.git
   cd medsecure
   ```

2. Install dependencies:
   ```bash
   npm run install-all
   ```

3. Set up environment variables:
   ```bash
   # Create .env files in both client and server directories
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
/medsecure
├── /client               # React.js frontend
│   ├── /components      # Reusable components
│   ├── /pages          # Page components
│   ├── /services       # API services
│   └── /utils          # Helper functions
├── /server              # Node.js + Express backend
│   ├── /controllers    # Route controllers
│   ├── /models        # MongoDB models
│   ├── /routes        # API routes
│   └── /utils         # Helper functions
└── /contracts          # Smart contracts
    └── MedSecure.sol   # Main contract
```

## 👥 User Roles

1. **Patient**
   - Upload medical records
   - Grant/revoke doctor access
   - View access history

2. **Doctor**
   - View granted records
   - Add diagnosis/prescriptions
   - Request access

3. **Admin**
   - Manage platform
   - Handle user reports
   - View analytics

## 🔐 Security Features

- End-to-end encryption of medical records
- Blockchain-based access control
- Role-based authentication
- Audit trails for all actions
- Emergency access protocols

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details 