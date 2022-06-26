'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const UniversityId = Schema.Types.UniversityId;
const Mixed = Schema.Types.Mixed;

var universitySchema = Schema( {
    web_pages: Mixed,
    name: String,
    alpha_two_code: String,
    state_province: String,
    domains: Mixed,
    country: String,
} );

module.exports = mongoose.model( 'Course', courseSchema );
