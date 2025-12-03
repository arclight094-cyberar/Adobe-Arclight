import mongoose from 'mongoose';

const imageVersionSchema = new mongoose.Schema({
    imageUrl: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    prompt: {
        type: String,
        default: '' // Empty for original image
    },
    operation: {
        type: String,
        enum: ['original', 'segment', 'remove-background', 'enhance', 'upscale', 'style-transfer', 'crop', 'custom'],
        default: 'original'
    },
    width: {
        type: Number,
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    format: {
        type: String,
        required: true
    },
    size: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const projectSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'Untitled Project'
    },
    originalImage: {
        type: imageVersionSchema,
        required: true
    },
    versions: [imageVersionSchema], // History of edits (max 10)
    maxVersions: {
        type: Number,
        default: 10 // User can customize this
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
projectSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Method to add a new version (maintains max limit)
projectSchema.methods.addVersion = function (versionData) {
    this.versions.push(versionData);

    // Keep only the last N versions (excluding original)
    if (this.versions.length > this.maxVersions) {
        this.versions = this.versions.slice(-this.maxVersions);
    }

    return this.save();
};

// Method to get latest version
projectSchema.methods.getLatestVersion = function () {
    if (this.versions.length > 0) {
        return this.versions[this.versions.length - 1];
    }
    return this.originalImage; // No edits yet, return original
};

const Project = mongoose.model('Project', projectSchema);
export default Project;
