const hre = require('hardhat')

async function main() {
	let deployer, addrs

	const unrevealedRaritiesBaseURI =
		'https://ipfs.io/ipfs/' +
		require('../metadata/unrevealed/uris').json +
		'/'

	console.log(unrevealedRaritiesBaseURI)

	const revealedRaritiesBaseURI =
		'https://ipfs.io/ipfs/' +
		require('../metadata/revealed/uris').json +
		'/'

	console.log(revealedRaritiesBaseURI)

	const Contract = await hre.ethers.getContractFactory('Twinesis')
	const contract = await Contract.deploy(
		unrevealedRaritiesBaseURI,
		revealedRaritiesBaseURI,
		process.env.MAINNET_WITHDRAWAL_1,
		process.env.MAINNET_WITHDRAWAL_2,
		{gasPrice: 19000000000}
	)

	const tx = contract.deployTransaction
	console.log('Deployment tx:', tx.hash)

	await contract.deployed()
	;[deployer, ...addrs] = await ethers.getSigners()

	console.log('Twinesis deployed to:', contract.address)
	console.log('Deployed by:', deployer.address)
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
