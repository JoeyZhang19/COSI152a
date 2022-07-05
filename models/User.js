'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;

var userSchema = Schema( {
  username: String,
  passphrase: String,
  age: String,
  email: String,
  sat: Number,
  dreamschool: String
} );

module.exports = mongoose.model( 'User', userSchema );
