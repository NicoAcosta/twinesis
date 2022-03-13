const fs = require('fs')
const path = require('path')

clean('revealed/json/')
clean('unrevealed/json/')

const data = require('./data')
const levels = require('./levels')

const rarities = ['Blue', 'Red', 'Gold']

const revealedURI = require('../revealed/uris').media
const unrevealedURI = require('../unrevealed/uris').media

// Contract metadata

class CollectionMetadata {
	constructor(uri) {
		;(this.name = data.name),
			(this.description = data.description),
			(this.image =
				'https://ipfs.io/ipfs/' +
				uri +
				'/collection.' +
				data.collection_icon_extension),
			(this.external_link = data.url),
			(this.seller_fee_basis_points = data.seller_fee_basis_points),
			(this.fee_recipient = data.fee_recipient),
			(this.seller_fee_basis_points = data.fee_points)
	}
}

// Token metadata

class TokenMetadata {
	constructor(rarity, level, percentage) {
		this.name = `${data.name} ${rarity.toUpperCase()} | ${
			level.name
		} (${percentage}%)`

		this.external_url = data.url
		this.description = data.description

		this.attributes = [
			{trait_type: 'Level', value: level.name},
			{trait_type: 'Level', value: level.order, max_value: 4},
			{trait_type: 'Rarity', value: rarity},
			{
				trait_type: 'Journey',
				value: percentage,
				display_type: 'boost_percentage'
			}
		]
	}
}

class RevealedMetadata extends TokenMetadata {
	constructor(rarity, level, percentage) {
		super(rarity, level, percentage)

		this.image = revealedMediaString('images', rarity, level, '.png')
		this.animation_url = revealedMediaString(
			'videos',
			rarity,
			level,
			'.mp4'
		)
	}
}

function revealedMediaString(type, rarity, level, extension) {
	return (
		'https://ipfs.io/ipfs/' +
		revealedURI +
		'/' +
		type +
		'/' +
		rarity.toLowerCase() +
		'-' +
		level.name.toLowerCase() +
		extension
	)
}

class UnrevealedMetadata extends TokenMetadata {
	constructor(rarity, level, percentage) {
		super(rarity, level, percentage)

		this.image = 'https://ipfs.io/ipfs/' + unrevealedURI + '/unrevealed.gif'
	}
}

// Revealed rarities metadata

for (let rarity of rarities) {
	for (let level of levels) {
		for (
			let percentage = level.minPercentage;
			percentage <= level.maxPercentage;
			percentage++
		) {
			const meta = new RevealedMetadata(rarity, level, percentage)
			write(
				'revealed/json/',
				jsonFileName(rarity, level, percentage),
				JSON.stringify(meta)
			)
		}
	}
}

const revealedCollection = new CollectionMetadata(revealedURI)
write('revealed/json/', 'collection.json', JSON.stringify(revealedCollection))

// Unrevealed rarities metadata

for (let level of levels) {
	for (
		let percentage = level.minPercentage;
		percentage <= level.maxPercentage;
		percentage++
	) {
		const meta = new UnrevealedMetadata('Unrevealed', level, percentage)
		write(
			'unrevealed/json/',
			jsonFileName('Unrevealed', level, percentage),
			JSON.stringify(meta)
		)
	}
}

const unrevealedCollection = new CollectionMetadata(unrevealedURI)
write(
	'unrevealed/json/',
	'collection.json',
	JSON.stringify(unrevealedCollection)
)

// Write

function jsonFileName(rarity, level, percentage) {
	return `${rarity.toLowerCase()}-${level.name.toLowerCase()}-${percentage}.json`
}

function write(root, filename, content) {
	fs.writeFile(root + filename, content, (error) => {
		if (error) throw error
	})
}

// Clean

function clean(directory) {
	fs.readdir(directory, (err, files) => {
		if (err) throw err

		for (const file of files) {
			fs.unlink(path.join(directory, file), (err) => {
				if (err) throw err
			})
		}
	})
}
