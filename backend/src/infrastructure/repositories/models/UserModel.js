'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const refreshTokenSchema = new Schema(
  {
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    userAgent: { type: String },
    ip: { type: String },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: { values: ['admin', 'developer', 'viewer'], message: 'Role must be admin, developer, or viewer' },
      default: 'developer',
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      select: false,
    },
    verificationCodeExpiresAt: {
      type: Date,
      select: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    firstName: { type: String, trim: true, maxlength: 50 },
    lastName: { type: String, trim: true, maxlength: 50 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

/**
 * Returns user object without sensitive fields.
 * @returns {object}
 */
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    isVerified: this.isVerified,
    firstName: this.firstName,
    lastName: this.lastName,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Find user by email address.
 * @param {string} email
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase().trim(), isActive: true });
};

/**
 * Find user by email and include password hash.
 * @param {string} email
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: email.toLowerCase().trim(), isActive: true }).select('+passwordHash');
};

/**
 * Find user by id and include refresh tokens.
 * @param {string} id
 * @returns {Promise<User|null>}
 */
userSchema.statics.findByIdWithTokens = function (id) {
  return this.findById(id).select('+refreshTokens');
};

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;
