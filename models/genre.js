var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var GenreSchema = new Schema(
    {
	name: {type: String, required: [true, 'name is required'], min: [3,'name is too short!'], max: 100},	
    }
);

// Virtual for Genre's URL
GenreSchema
    .virtual('url')
    .get(function () {
	return '/catalog/genre/' + this._id;
    });

// Export
module.exports = mongoose.model('Genre', GenreSchema);
