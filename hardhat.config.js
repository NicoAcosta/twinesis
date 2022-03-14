require('dotenv').config()

require('@nomiclabs/hardhat-etherscan')
require('@nomiclabs/hardhat-waffle')
require('hardhat-gas-reporter')
require('solidity-coverage')

require('hardhat-abi-exporter')

module.exports = {
	solidity: '0.8.9',
	networks: {
		mainnet: {
			url: process.env.MAINNET_NODE_URL,
			accounts: [process.env.MAINNET_DEPLOYER_PRIVATE_KEY]
		},
		rinkeby: {
			url: process.env.RINKEBY_NODE_URL,
			accounts: [process.env.TESTNET_DEPLOYER_PRIVATE_KEY]
		}
	},
	gasReporter: {
		enabled: true,
		currency: 'USD'
	},
	etherscan: {
		apiKey: process.env.ETHERSCAN_API_KEY
	},
	abiExporter: {
		path: './abi',
		runOnCompile: true,
		flat: true,
		only: ['Twinesis', 'ITwinesis', 'TestnetTwinesis'],
		spacing: 2,
		pretty: true
	}
}
