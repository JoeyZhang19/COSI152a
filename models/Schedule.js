'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;

var scheduleSchema = Schema( {
  userId: {type:Schema.Types.ObjectId, ref:'User'},
  universityName:{type:Schema.Types.ObjectId,ref:'University'},
} );

module.exports = mongoose.model( 'Schedule', scheduleSchema );
