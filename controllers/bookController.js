var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');

var async = require('async');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

exports.index = function(req,res) {

    async.parallel({
	book_count: function(callback) {
	    Book.countDocuments({},callback);
	},
	book_instance_count: function(callback){
	    BookInstance.countDocuments({}, callback);
	},
	book_instance_available_count: function(callback) {
	    BookInstance.countDocuments({status: 'Available'}, callback);
	},
	author_count: function(callback) {
	    Author.countDocuments({}, callback);
	},
	genre_count: function(callback){
	    Genre.countDocuments({}, callback);
	}
    }, function(err, results) {
	res.render('index', {title: 'Local Library Home', error: err, data: results });
    });
};

// Display list of all Books
exports.book_list = function(req,res, next) {
    Book.find({}, 'title author')
	.populate('author')
	.exec(function (err, list_books) {
	    if (err) {
		return next(err);
	    }
	    res.render('book_list', { title: 'Book List', book_list: list_books });
	});  
};

// Display detail page for a specific Book
exports.book_detail = function(req, res, next) {

    async.parallel({
	book: function(callback) {
	    Book.findById(req.params.id)
		.populate('author')
		.populate('genre')
		.exec(callback);	    
	},
	book_instance: function(callback) {
	    BookInstance.find({ 'book': req.params.id })
			.exec(callback);	    
	},
    }, function(err, results) {
	if (err) {
	    return next(err);
	}
	if (results.book==null) {
	    var err = new Error('Book not found');
	    err.status = 404;
	    return next(err);
	}
	res.render('book_detail', { title: results.book.title, book: results.book, book_instances: results.book_instance });
    });
};

// Display Book form on GET
exports.book_create_get = function(req, res, next) {

    // Get all authors and genres, which are needed to create book objects
    async.parallel({
	authors: function(callback) {
	    Author.find(callback);
	},
	genres: function(callback) {
	    Genre.find(callback);
	},
    }, function(err, results) {
	if (err) {
	    return next(err);
	}
	res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres });
    });
};

// Handle Book create on POST
exports.book_create_post = [
    // Convert the genre to an array.
    (req, res, next) => {
	if (!(req.body.genre instanceof Array)){
	    if(typeof req.body.genre==='undefined')
		req.body.genre=[];
	    else
		req.body.genre=new Array(req.body.genre);
	}
	next();
    },

    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }),
    body('isbn', 'ISBN must not be empty.').trim().isLength({ min: 1 }),

    sanitizeBody('*').escape(),

    (req, res, next) => {
	const errors = validationResult(req);

	var book = new Book(
	    {
		title: req.body.title,
		author: req.body.author,
		summary: req.body.summary,
		isbn: req.body.isbn,
		genre: req.body.genre
	    }
	);

	if (!errors.isEmpty()) {
	    async.parallel({
		authors: function(callback) {
		    Author.find(callback);
		},
		genres: function(callback) {
		    Genre.find(callback);
		},
	    }, function(err, results) {
		if (err) {
		    return next(err);
		}

		// Mark our selected genres as checked.
		for (let i = 0; i < results.genres.length; i++) {
		    if (book.genre.indexOf(results.genres[i]._id) > -1) {
			results.genres[i].checked='true';
		    }
		}
		res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
	    });
	    return;
	} else {
	    book.save(function (err) {
		if (err) {
		    return next(err);
		}
		res.redirect(book.url);
	    });
	}
    }
];

// Display Book delete form on GET
exports.book_delete_get = function(req, res, next) {
    
    // Find the book marked for deletion. If there are any
    // copies of the book, re-render the form passing
    // the associated copies. Else, remove the book.
    async.parallel({
	book: function(callback) {
	    Book.findById(req.params.id)
		  .exec(callback);
	},
	bookinstances: function(callback) {
	    BookInstance.find({ 'book': req.params.id })
		.exec(callback);
	},
    }, function(err, results) {
	if (err) {
	    return next(err);
	}
	if (results.book==null) {
	    res.redirect('/catalog/books');
	}
	res.render('book_delete', { title: 'Delete Book', book: results.book, bookinstances: results.bookinstances });
    });
};

// Handle Book delete on POST
exports.book_delete_post = function(req, res, next) {

    // Find the book marked for deletion. If there are still copies
    // of the book, re-render the form passing the list of copies.
    // Else, remove the book.
    async.parallel({
	book: function(callback) {
	    Book.findById(req.body.bookid)
		.exec(callback);
	},
	bookinstances: function(callback) {
	    BookInstance.find({ 'book': req.body.bookid })
		.exec(callback);	    
	},
    }, function(err, results) {
	if (err) {
	    return next(err);
	}
	if (results.bookinstances.length > 0) {
	    res.render('book_delete', { title: 'Delete Book', book: results.book, bookinstances: results.bookinstances });
	    return;
	} else {
	    Book.findByIdAndRemove(req.body.bookid, function deleteBook(err) {
		if (err) {
		    return next(err);
		}
		res.redirect('/catalog/books');
	    });
	}
    });    
};

// Display Book update form on GET
exports.book_update_get = function(req, res, next) {

    // Get book, authors and genres for form
    async.parallel({
	book: function(callback) {
	    Book.findById(req.params.id)
		.populate('author')
		.populate('genre')
		.exec(callback);	    
	},
	authors: function(callback) {
	    Author.find(callback);
	},
	genres: function(callback) {
	    Genre.find(callback);
	},
    }, function(err, results) {
	if (err) {
	    return next(err);
	}
	if (results.book==null) {
	    var err = new Error('Book not found');
	    err.status = 404;
	    return next(err);
	}
	// Success.
	// Mark selected genres as checked.
	for (let all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++) {
	    for (let book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++) {
		if (results.genres[all_g_iter]._id.toString()==results.book.genre[book_g_iter]._id.toString()) {
		    results.genres[all_g_iter].checked = 'true';
		}
	    }
	}
	res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: results.book });
    });
};

// Handle Book update on POST
exports.book_update_post = [
    
    // Convert the genre to an array
    (req, res, next) => {
	if (!(req.body.genre instanceof Array)){
	    if (typeof req.body.genre==='undefined')
		req.body.genre=[];
	    else
		req.body.genre = new Array(req.body.genre);
	}
	next();
    },

    //Validation
    body('title','Title must not be empty.').trim().isLength({ min: 1 }),
    body('author','Author must not be empty.').trim().isLength({ min: 1 }),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }),
    body('isbn','ISBN must not be empty.').trim().isLength({ min: 1 }),

    //Sanitization
    sanitizeBody('title').escape(),
    sanitizeBody('author').escape(),
    sanitizeBody('summary').escape(),
    sanitizeBody('isbn').escape(),
    sanitizeBody('genre.*').escape(),

    // Perform the update
    (req, res, next) => {
	// Extract validation errors from the request
	const errors = validationResult(req);

	var book = new Book(
	    {
		title: req.body.title,
		author: req.body.author,
		summary: req.body.summary,
		isbn: req.body.isbn,
		genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
		_id: req.params.id //This is required, or a new ID will be assigned
	    }
	);

	if (!errors.isEmpty()) {
	    //Render the form again
	    async.parallel({
		authors: function(callback) {
		    Author.find(callback);
		},
		genres: function(callback) {
		    Genre.find(callback);
		},
	    }, function(err, results) {
		if (err) {
		    return next(err);
		}
		for (let i = 0; i < results.genres.length; i++) {
		    if (book.genre.indexOf(results.genres[i]._id) > -1) {
			results.genres[i].checked='true';
		    }
		}
		res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
	    });
	    return;
	} else {
	    //Update book record
	    Book.findByIdAndUpdate(req.params.id, book, {}, function (err, thebook) {
		if (err) {
		    return next(err);
		}
		res.redirect(thebook.url);
	    });
	}
    }
];
