class Level {
	constructor(_order, _name, _minPercentage, _maxPercentage) {
		;(this.order = _order),
			(this.name = _name),
			(this.minPercentage = _minPercentage),
			(this.maxPercentage = _maxPercentage)
	}
}

module.exports = [
	new Level(1, 'Collector', 0, 33), // white
	new Level(2, 'Believer', 33, 66), // blue
	new Level(3, 'Supporter', 66, 99), // red
	new Level(4, 'Fan', 100, 100) // gold
]
