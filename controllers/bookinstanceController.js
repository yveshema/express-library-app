var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all BookInstances
exports.bookinstance_list = function(req,res, next) {

    BookInstance.find()
		.populate('book')
		.exec(function (err, list_bookinstances) {
		    if (err) {
			return next(err);
		    }
		    res.render('bookinstance_list',
			       { title: 'Book Instance List', bookinstance_list: list_bookinstances });
		});
};

// Display detail page for a specific Bookinstance
exports.bookinstance_detail = function(req, res, next) {
    BookInstance.findById(req.params.id)
		.populate('book')
		.exec(function (err, bookinstance) {
		    if(err) {
			return next(err);
		    }
		    if (bookinstance==null) {
			var err = new Error('Book copy not found');
			err.status = 404;
			return next(err);
		    }
		    res.render('bookinstance_detail', { title: 'Copy: ' + bookinstance.book.title, bookinstance: bookinstance });
		});
};

// Display Bookinstance form on GET
exports.bookinstance_create_get = function(req, res, next) {

    Book.find({}, 'title')
	.exec(function(err, books){
	    if (err) {
		return next(err);
	    }
	    res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books });
	});
};

// Handle Bookinstance create on POST
exports.bookinstance_create_post = [

    body('book', 'Book must be specified').trim().isLength({ min: 1 }),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),

    (req, res, next) => {
	const errors = validationResult(req)

	var bookinstance = new BookInstance(
	    {
		book: req.body.book,
		imprint: req.body.imprint,
		status: req.body.status,
		due_back: req.body.due_back
	    }
	);

	if (!errors.isEmpty()) {
	    Book.find({}, 'title')
		.exec(function (err, books) {
		    if (err) {
			return next(err);
		    }
		    res.render('bookinstance_form', {
			title: 'Create BookInstance',
			book_list: books,
			selected_book: bookinstance.book._id,
			errors: errors.array(),
			bookinstance: bookinstance });
		});
	    return;
	} else {
	    bookinstance.save(function (err) {
		if (err) {
		    return next(err);
		}
		res.redirect(bookinstance.url);
	    });
	}
    }
];

// Display Bookinstance delete form on GET
exports.bookinstance_delete_get = function(req, res, next) {

    // Find the book copy  marked for deletion and if it
    // exists display the delete form.

    BookInstance.findById(req.params.id)
		.populate('book')
    		.exec(function (err, bookinstance) {
		    if (err) {
			return next(err);
		    }
		    if (bookinstance==null) { // copy doesn't exist
			res.redirect('/catalog/bookinstances');
		    }
		    res.render('bookinstance_delete', { title: 'Delete Copy', bookinstance: bookinstance });
		});
};

// Handle Bookinstance delete on POST
exports.bookinstance_delete_post = function(req, res, next) {

    // Find the book copy marked for deletion and if it exists
    // remove it.
    BookInstance.findByIdAndRemove(req.body.bookinstanceId, function deleteBookinstance(err) {
	if (err) {
	    return next(err);
	}
	res.redirect('/catalog/bookinstances')
    });
};

// Display Bookinstance update form on GET
exports.bookinstance_update_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Bookinstance update GET');    
};

// Handle Bookinstance update on POST
exports.bookinstance_update_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Bookinstance update GET');    
};
