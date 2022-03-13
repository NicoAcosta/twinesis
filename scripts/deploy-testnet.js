const hre = require('hardhat')

async function main() {
	let deployer, addrs

	const unrevealedRaritiesBaseURI =
		'https://ipfs.io/ipfs/' +
		require('../metadata/unrevealed/uris').json +
		'/'

	console.log(unrevealedRaritiesBaseURI)

	const Contract = await hre.ethers.getContractFactory('TestnetTwinesis')
	const contract = await Contract.deploy(
		unrevealedRaritiesBaseURI,
		process.env.TESTNET_WITHDRAWAL_1,
		process.env.TESTNET_WITHDRAWAL_2,
		'Twinesis v0.1'
	)

	await contract.deployed()
	;[deployer, ...addrs] = await ethers.getSigners()

	console.log('TestnetTwinesis deployed to:', contract.address)
	console.log('Deployed by:', deployer.address)
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
