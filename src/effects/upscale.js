import GObject from 'gi://GObject';

import * as utils from '../conveniences/utils.js';
const Shell = await utils.import_in_shell_only('gi://Shell');
const Clutter = await utils.import_in_shell_only('gi://Clutter');

const SHADER_FILENAME = 'upscale.glsl';
const DEFAULT_PARAMS = {
    factor: 4, width: 0, height: 0
};


export const UpscaleEffect = utils.IS_IN_PREFERENCES ?
    { default_params: DEFAULT_PARAMS } :
    new GObject.registerClass({
        GTypeName: "UpscaleEffect",
        Properties: {
            'factor': GObject.ParamSpec.int(
                `factor`,
                `Factor`,
                `Factor`,
                GObject.ParamFlags.READWRITE,
                0, 64,
                4,
            ),
            'width': GObject.ParamSpec.double(
                `width`,
                `Width`,
                `Width`,
                GObject.ParamFlags.READWRITE,
                0.0, Number.MAX_SAFE_INTEGER,
                0.0,
            ),
            'height': GObject.ParamSpec.double(
                `height`,
                `Height`,
                `Height`,
                GObject.ParamFlags.READWRITE,
                0.0, Number.MAX_SAFE_INTEGER,
                0.0,
            )
        }
    }, class UpscaleEffect extends Clutter.ShaderEffect {
        constructor(params) {
            super(params);

            this._factor = null;
            this._width = null;
            this._height = null;

            this.factor = 'factor' in params ? params.factor : this.constructor.default_params.factor;
            this.width = 'width' in params ? params.width : this.constructor.default_params.width;
            this.height = 'height' in params ? params.height : this.constructor.default_params.height;

            // set shader source
            this._source = utils.get_shader_source(Shell, SHADER_FILENAME, import.meta.url);
            if (this._source)
                this.set_shader_source(this._source);
        }

        static get default_params() {
            return DEFAULT_PARAMS;
        }

        get factor() {
            return this._factor;
        }

        set factor(value) {
            if (this._factor !== value) {
                this._factor = value;

                this.set_uniform_value('factor', this._factor);
            }
        }

        get width() {
            return this._width;
        }

        set width(value) {
            if (this._width !== value) {
                this._width = value;

                this.set_uniform_value('width', parseFloat(this._width - 1e-6));
            }
        }

        get height() {
            return this._height;
        }

        set height(value) {
            if (this._height !== value) {
                this._height = value;

                this.set_uniform_value('height', parseFloat(this._height - 1e-6));
            }
        }

        vfunc_set_actor(actor) {
            if (this._actor_connection_size_id) {
                let old_actor = this.get_actor();
                old_actor?.disconnect(this._actor_connection_size_id);
            }
            if (actor) {
                this.width = actor.width;
                this.height = actor.height;
                this._actor_connection_size_id = actor.connect('notify::size', _ => {
                    this.width = actor.width;
                    this.height = actor.height;
                });
            }
            else
                this._actor_connection_size_id = null;

            super.vfunc_set_actor(actor);
        }

        vfunc_paint_target(paint_node = null, paint_context = null) {
            // force setting nearest-neighbour texture filtering
            this.get_pipeline().set_layer_filters(0, 9728, 9728);

            if (paint_node && paint_context)
                super.vfunc_paint_target(paint_node, paint_context);
            else if (paint_node)
                super.vfunc_paint_target(paint_node);
            else
                super.vfunc_paint_target();
        }
    });