/*
 * Copyright 2018 WICKLETS LLC
 *
 * This file is part of Wick Editor.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Editor.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { Component } from 'react';
import './_inspectortitle.scss';
import 'bootstrap/dist/css/bootstrap.min.css';

import ToolIcon from 'Editor/Util/ToolIcon/ToolIcon';

class InspectorTitle extends Component {
  render() {
    return(
      <div className="inspector-title">
        <div className="inspector-title-name">Inspector</div>
        <div className="inspector-title-selection-type">
          <div className="inspector-selection-type-icon-container">
            <ToolIcon name={this.props.type} />
          </div>{this.props.title}</div>
      </div>
    )
  }
}

export default InspectorTitle