/*
 * Copyright 2018 WICKLETS LLC
 *
 * This file is part of Wick Engine.
 *
 * Wick Engine is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Engine is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Engine.  If not, see <https://www.gnu.org/licenses/>.
 */

Wick.FileAsset = class extends Wick.Asset {
    /**
     * Returns all valid MIME types for files which can be converted to Wick Assets.
     * @return {string[]} Array of strings of MIME types in the form MediaType/Subtype.
     */
    static getValidMIMETypes () {
        let imageTypes = Wick.ImageAsset.getValidMIMETypes();
        let soundTypes = Wick.SoundAsset.getValidMIMETypes();
        return imageTypes.concat(soundTypes);
    }

    /**
     * Returns all valid extensions types for files which can be attempted to be
     * converted to Wick Assets.
     * @return  {string[]} Array of strings representing extensions.
     */
    static getValidExtensions () {
        let imageExtensions = Wick.ImageAsset.getValidExtensions();
        let soundExtensions = Wick.SoundAsset.getValidExtensions();
        return imageExtensions.concat(soundExtensions);
    }

    constructor (args) {
        if(!args) args = {};
        args.name = args.filename;
        super(args);

        this.filename = args.filename;
        this.src = args.src;
    }

    serialize () {
        var data = super.serialize();

        data.filename = this.filename;
        data.MIMEType = this.MIMEType;
        data.fileExtension = this.fileExtension;

        return data;
    }

    deserialize (data) {
        super.deserialize(data);

        this.filename = data.filename;

        return object;
    }

    get classname () {
        return 'FileAsset';
    }

    /**
     * The source of the data of the asset, in base64.
     */
    get src () {
        return Wick.FileCache.getFile(this.uuid).src;
    }

    set src (src) {
        Wick.FileCache.addFile(src, this.uuid);
    }

    /**
     * The MIMEType of the asset (format: type/subtype)
     */
    get MIMEType () {
        return this._MIMETypeOfString(this.src);
    }

    /**
     * The file extension of the asset.
     */
    get fileExtension () {
        return this._fileExtensionOfString(this.src);
    }

    _MIMETypeOfString (string) {
        return string.split(':')[1].split(',')[0].split(';')[0];
    }

    _fileExtensionOfString (string) {
        var MIMEType = this._MIMETypeOfString(string);
        return MIMEType && MIMEType.split('/')[1];
    }
}
