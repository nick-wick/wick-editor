import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './_toolbutton.scss'


import ToolIcon from 'Editor/Util/ToolIcon/ToolIcon';

import iconBrush from 'resources/tool-icons/brush.svg';
import iconCursor from 'resources/tool-icons/cursor.svg';
import iconEllipse from 'resources/tool-icons/ellipse.svg';
import iconRectangle from 'resources/tool-icons/rect.svg';
import iconLine from 'resources/tool-icons/line.svg';
import iconPencil from 'resources/tool-icons/pencil.svg';
import iconEyeDropper from 'resources/tool-icons/eyedropper.svg';
import iconEraser from 'resources/tool-icons/eraser.svg';
import iconPan from 'resources/tool-icons/pan.svg';
import iconZoom from 'resources/tool-icons/zoom.svg';

class ToolButton extends Component {
  constructor(props) {
    super(props);

    this.icons = {
      "croquisBrush":iconBrush,
      "cursor":iconCursor,
      "ellipse":iconEllipse,
      "rectangle":iconRectangle,
      "line":iconLine,
      "pencil":iconPencil,
      "eyedropper":iconEyeDropper,
      "eraser":iconEraser,
      "pan":iconPan,
      "zoom":iconZoom,

    }
  }

  render() {
    return(
      <div
        type="button"
        className={this.props.toolIsActive(this.props.name) ? "tool-button active-tool" : "tool-button"}
        onClick={() => {this.props.activateTool(this.props.name)}}
        >
        <ToolIcon name={this.props.name} />
      </div>
    )
  }
}

export default ToolButton