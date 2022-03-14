const {expect} = require('chai')
const {ethers} = require('hardhat')

const mintValue = ethers.utils.parseEther('0.06')

const artist = ethers.utils.getAddress(
	'0x567B5E79cE0d465a0FF1e1eeeFE65d180b4C5D41'
)
const developer = ethers.utils.getAddress(
	'0xab468Aec9bB4b9bc59b2B2A5ce7F0B299293991f'
)

const publicMintingDate = 1647284400
const revealDate = 1647300000
const days = 86400

const unrevealedRaritiesBaseURI =
	'https://ipfs.io/ipfs/' + require('../metadata/unrevealed/uris').json + '/'

const revealedRaritiesBaseURI =
	'https://ipfs.io/ipfs/' + require('../metadata/revealed/uris').json + '/'

describe.only('Twinesis', async function () {
	let contract, deploymentTimestamp

	// eslint-disable-next-line no-unused-vars
	let deployer, withdrawal1, withdrawal2, addr1, addr2, addr3, addr4, addrs

	beforeEach(async function () {
		;[
			deployer,
			withdrawal1,
			withdrawal2,
			creator,
			whitelisted,
			addr1,
			addr2,
			addr3,
			addr4,
			...addrs
		] = await ethers.getSigners()

		const Contract = await ethers.getContractFactory('Twinesis')
		contract = await Contract.deploy(
			unrevealedRaritiesBaseURI,
			revealedRaritiesBaseURI,
			withdrawal1.address,
			withdrawal2.address
		)

		const deployment = await contract.deployed()
		const deploymentBlockNumber = deployment.deployTransaction.blockNumber
		const deploymentBlock = await ethers.provider.getBlock(
			deploymentBlockNumber
		)
		deploymentTimestamp = deploymentBlock.timestamp
	})

	describe('Public minting dates', async function () {
		before(async function () {
			await setTimestamp(publicMintingDate - 2000)
			await mine()
		})

		it('Should revert when trying to mint before public mint start block', async function () {
			expect(await getTimestamp()).to.be.lessThan(publicMintingDate)

			await expect(
				contract.mintTwin({value: mintValue})
			).to.be.revertedWith('Public minting has not started yet')
		})

		it('Should enable minting from minting start date', async function () {
			await setTimestamp(publicMintingDate)
			await mine()

			await mintTwin(addr1)
			await mintTwins(addr1, 2)
		})
	})

	describe('Deployment constructor', async function () {
		it('Should mint tokens for artist developer and deployer', async function () {
			expect(await contract.balanceOf(artist)).to.equal(2)

			expect(await contract.balanceOf(deployer.address)).to.equal(2)

			expect(await contract.balanceOf(developer)).to.equal(2)

			expect(await contract.ownerOf(20)).to.equal(artist)

			expect(await contract.ownerOf(8)).to.equal(developer)

			expect(await contract.ownerOf(222)).to.equal(deployer.address)

			expect(await contract.mintedTokens()).to.equal(6)
		})
	})

	describe('Minting', async function () {
		it('Should mint one token', async function () {
			await mintTwin(addr1)

			expect(await contract.balanceOf(addr1.address)).to.equal(1)
		})

		it('Should mint many tokens', async function () {
			await mintTwins(addr1, 8)

			expect(await contract.balanceOf(addr1.address)).to.equal(8)
		})

		it('Should not mint id 0', async function () {
			await mintAll()
			expect(await contract.mintedTokens()).to.equal(222)

			await expect(contract.ownerOf(0)).to.be.revertedWith(
				'ERC721: owner query for nonexistent token'
			)
		})

		it('Should revert if 222 tokens have been minted', async function () {
			await mintAll()

			await expect(
				contract.mintTwin({value: mintValue})
			).to.be.revertedWith('Max tokens already minted')
		})

		it('Should mint all ids', async function () {
			const ids = [1, 8, 10, 20, 217, 222]

			for (let i = 0; i < 216; i++) {
				const minting = await mintTwin(addr1)

				ids.push(minting.tokenId)
			}

			ids.sort((a, b) => a - b)

			const control = [...Array(223).keys()]
			control.splice(0, 1)

			expect(JSON.stringify(ids)).to.equal(JSON.stringify(control))
		})
	})

	describe('URIs', async function () {
		describe('Unrevealed URI', async function () {
			it('Should return metadata not revealed', async function () {
				expect(await contract.raritiesHaveBeenRevealed()).to.equal(
					false
				)
			})

			describe('Unrevealed contract URI', async function () {
				it('Should return unrevealed contract URI', async function () {})
			})

			describe('Unrevealed token URI', async function () {
				it('Should return unrevealed token URI', async function () {
					await mintAll()

					expect(await contract.tokenURI(1)).to.equal(
						unrevealedRaritiesBaseURI +
							'unrevealed-collector-0.json'
					)
					expect(await contract.tokenURI(87)).to.equal(
						unrevealedRaritiesBaseURI +
							'unrevealed-collector-0.json'
					)
					expect(await contract.tokenURI(211)).to.equal(
						unrevealedRaritiesBaseURI +
							'unrevealed-collector-0.json'
					)
				})
			})
		})

		describe('Revealed URI', async function () {
			before(async function () {
				await setTimestamp(revealDate + 1)
			})

			it('Should return metadata revealed', async function () {
				expect(await contract.raritiesHaveBeenRevealed()).to.equal(true)
			})

			describe('Revealed contract URI', async function () {
				it('Should return revealed contract URI', async function () {
					expect(await contract.contractURI()).to.equal(
						uri('collection')
					)
				})
			})

			describe('Revealed Token URIs', async function () {
				let tokenURI

				beforeEach(async function () {
					await mintAll()
				})

				describe('Rarities', async function () {
					it('Should return expected rarity URI', async function () {
						for (let tokenId = 1; tokenId < 223; tokenId++) {
							const rarity = rarityString(tokenId)
							expect(await contract.tokenURI(tokenId)).to.equal(
								uri(rarity + '-collector-0')
							)
						}
					})
				})

				describe('Levels', async function () {
					it('Should return collector level URIs', async function () {
						tokenURI = 'red-collector-0'
						expect(await contract.tokenURI(1)).to.equal(
							uri(tokenURI)
						)

						tokenURI = 'red-collector-33'
						await skipDaysFromDeployment(59.8)
						expect(await contract.tokenURI(1)).to.equal(
							uri(tokenURI)
						)
					})

					it('Should return believer level URIs', async function () {
						tokenURI = 'red-believer-33'
						await skipDaysFromDeployment(60)
						expect(await contract.tokenURI(1)).to.equal(
							uri(tokenURI)
						)

						tokenURI = 'red-believer-66'
						await skipDaysFromDeployment(119)
						expect(await contract.tokenURI(1)).to.equal(
							uri(tokenURI)
						)
					})

					it('Should return supporter level URIs', async function () {
						tokenURI = 'red-supporter-66'

						await skipDaysFromDeployment(120)
						expect(await contract.tokenURI(1)).to.equal(
							uri(tokenURI)
						)

						tokenURI = 'red-supporter-99'
						await skipDaysFromDeployment(179)
						expect(await contract.tokenURI(1)).to.equal(
							uri(tokenURI)
						)
					})

					it('Should return fourth level URIs', async function () {
						tokenURI = 'red-fan-100'

						await skipDaysFromDeployment(180)
						expect(await contract.tokenURI(1)).to.equal(
							uri(tokenURI)
						)

						await skipDaysFromDeployment(200)
						expect(await contract.tokenURI(1)).to.equal(
							uri(tokenURI)
						)

						await skipDaysFromDeployment(500)
						expect(await contract.tokenURI(1)).to.equal(
							uri(tokenURI)
						)
					})
				})
			})
		})
	})

	describe('Levels', async function () {
		describe('Return levels', async function () {
			it('Should return collector level', async function () {
				expect(await contract.level(1)).to.equal(0)

				await skipDaysFromDeployment(59)
				expect(await contract.level(1)).to.equal(0)
			})

			it('Should return believer level', async function () {
				await skipDaysFromDeployment(60)
				expect(await contract.level(1)).to.equal(1)

				await skipDaysFromDeployment(119)
				expect(await contract.level(1)).to.equal(1)
			})

			it('Should return supporter level', async function () {
				await skipDaysFromDeployment(120)
				expect(await contract.level(1)).to.equal(2)

				await skipDaysFromDeployment(179)
				expect(await contract.level(1)).to.equal(2)
			})

			it('Should return fan level', async function () {
				await skipDaysFromDeployment(180)
				expect(await contract.level(1)).to.equal(3)

				await skipDaysFromDeployment(200)
				expect(await contract.level(1)).to.equal(3)

				await skipDaysFromDeployment(500)
				expect(await contract.level(1)).to.equal(3)
			})
		})

		describe('Resetting level', async function () {
			it('Should set outsetDate when minting (deployment)', async function () {
				expect(await contract.outsetDate(1)).to.equal(
					deploymentTimestamp
				)
			})

			it('Should set outsetDate when minting (public)', async function () {
				const minting = await mintTwin(addr1)

				expect(await contract.outsetDate(minting.tokenId)).to.equal(
					minting.timestamp
				)
			})

			it('Should reset outsetDate when transfering (before max level)', async function () {
				const minting = await mintTwin(addr1)

				const transferCall = await contract
					.connect(addr1)
					.transferFrom(addr1.address, addr2.address, minting.tokenId)
				const transferDate = await txDate(transferCall)

				expect(await contract.outsetDate(minting.tokenId)).to.equal(
					transferDate
				)
			})

			it('Should not reset outsetDate when transfering after max level', async function () {
				const minting = await mintTwin(addr1)

				await skipDaysFrom(minting.timestamp, 180)

				await contract
					.connect(addr1)
					.transferFrom(addr1.address, addr2.address, minting.tokenId)

				expect(await contract.outsetDate(minting.tokenId)).to.equal(
					minting.timestamp
				)
			})
		})
	})

	describe('Percentage', async function () {
		let minting

		beforeEach(async function () {
			minting = await mintTwin(addr1)
		})

		it('Should return 0', async function () {
			expect(await contract.journeyPercentage(minting.tokenId)).to.equal(
				0
			)

			await skipDaysFrom(minting.timestamp, 1)
			expect(await contract.journeyPercentage(minting.tokenId)).to.equal(
				0
			)
		})

		it('Should return 1', async function () {
			await skipDaysFrom(minting.timestamp, 2)
			expect(await contract.journeyPercentage(minting.tokenId)).to.equal(
				1
			)

			await skipDaysFrom(minting.timestamp, 3)
			expect(await contract.journeyPercentage(minting.tokenId)).to.equal(
				1
			)
		})

		it('Should return 99', async function () {
			await skipDaysFrom(minting.timestamp, 179)
			expect(await contract.journeyPercentage(minting.tokenId)).to.equal(
				99
			)
		})

		it('Should return 100', async function () {
			await skipDaysFrom(minting.timestamp, 180)
			expect(await contract.journeyPercentage(minting.tokenId)).to.equal(
				100
			)

			await skipDaysFrom(minting.timestamp, 181)
			expect(await contract.journeyPercentage(minting.tokenId)).to.equal(
				100
			)

			await skipDaysFrom(minting.timestamp, 200)
			expect(await contract.journeyPercentage(minting.tokenId)).to.equal(
				100
			)

			await skipDaysFrom(minting.timestamp, 10000)
			expect(await contract.journeyPercentage(minting.tokenId)).to.equal(
				100
			)
		})
	})

	describe('Rarities', async function () {
		beforeEach(async function () {
			await mintAll()
		})

		it('Should mint 22 gold, 66 red, 134 blue', async function () {
			const counter = {0: 0, 1: 0, 2: 0}

			for (let tokenId = 1; tokenId < 223; tokenId++) {
				const r = await contract.rarity(tokenId)
				counter[r] += 1

				console.log(tokenId, r)
			}

			expect(counter[2]).to.equal(22)
			expect(counter[1]).to.equal(66)
			expect(counter[0]).to.equal(134)
		})

		it('Should return expected rarities', async function () {
			for (let tokenId = 1; tokenId < 223; tokenId++) {
				expect(await contract.rarity(tokenId)).to.equal(
					expectedRarity(tokenId)
				)
			}
		})
	})

	describe('Withdraw', async function () {
		it('Should revert if caller is not a withdrawal address', async function () {
			await expect(contract.connect(addr1).withdraw()).to.be.revertedWith(
				'Caller cannot withdraw funds'
			)
		})

		it('Should withdraw to withdrawal addresses', async function () {
			await mintAll()

			const balance = await ethers.provider.getBalance(contract.address)

			const previousBalance1 = await ethers.provider.getBalance(
				withdrawal1.address
			)
			const previousBalance2 = await ethers.provider.getBalance(
				withdrawal2.address
			)

			const amount1 = balance.mul(150).div(1296)
			const amount2 = balance.sub(amount1)

			const expected1 = previousBalance1.add(amount1)
			const expected2 = previousBalance2.add(amount2)

			const withdrawal = await contract.connect(deployer).withdraw()
			await withdrawal.wait()

			expect(
				await ethers.provider.getBalance(withdrawal1.address)
			).to.equal(expected1)

			expect(
				await ethers.provider.getBalance(withdrawal2.address)
			).to.equal(expected2)

			expect(await ethers.provider.getBalance(contract.address)).to.equal(
				0
			)
		})
	})

	async function mintAll() {
		await mintTwins(addr1, 216)
		expect(await contract.mintedTokens()).to.equal(222)
	}

	function expectedRarity(id) {
		if (id % 10 == 0) {
			return 2 // gold
		} else if ((id + 2) % 3 == 0) {
			return 1 // red
		} else {
			return 0 // blue
		}
	}

	function rarityString(id) {
		switch (expectedRarity(id)) {
			case 0:
				return 'blue'
			case 1:
				return 'red'
			case 2:
				return 'gold'
		}
	}

	async function mintTwin(addr) {
		const mintCall = await contract
			.connect(addr)
			.mintTwin({value: mintValue})
		const data = await mintCall.wait()
		const id = data.events[0].args[2].toNumber()
		const date = await txDate(mintCall)

		return {tokenId: id, timestamp: date}
	}

	async function mintTwins(addr, amount) {
		const _value = mintValue.mul(amount)

		const mintCall = await contract
			.connect(addr)
			.mintTwins(amount, {value: _value})
		await mintCall.wait()

		return mintCall
	}

	async function skipDaysFrom(from, n) {
		const lateTs = from + days * n // + 60 days

		await setTimestamp(lateTs)
		await mine()
	}

	async function skipDaysFromDeployment(n) {
		await skipDaysFrom(deploymentTimestamp, n)
	}
})

async function getTimestamp() {
	const blockNumber = ethers.provider.blockNumber
	return (await ethers.provider.getBlock(blockNumber)).timestamp
}

async function setTimestamp(n) {
	await ethers.provider.send('evm_setNextBlockTimestamp', [n])
}

async function mine() {
	await ethers.provider.send('evm_mine')
}

function uri(_tokenURI) {
	return revealedRaritiesBaseURI + _tokenURI + '.json'
}

async function txDate(tx) {
	const blockNumber = tx.blockNumber
	const block = await ethers.provider.getBlock(blockNumber)
	return block.timestamp
}
