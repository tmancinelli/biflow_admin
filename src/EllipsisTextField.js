import React from 'react';
import ReactDOM from 'react-dom';
import { TextField } from 'react-admin';

const styles = {
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  maxWidth: '200px',
  whiteSpace: 'nowrap',
  height: 'auto',
};

class EllipsisTextField extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ellipsis: false,
    }
  }

  componentDidMount() {
    let ellipsis = false;
    for (let parent = ReactDOM.findDOMNode(this).parentNode; parent; parent = parent.parentNode) {
      if (parent.nodeName === 'TD') {
        ellipsis = true;
        break;
      }
    }
    this.setState({ellipsis});
  }

  render() {
    if (this.state.ellipsis) {
      return <TextField style={styles} {...this.props} />
    } else {
      return <TextField {...this.props} />
    }
  }
}

export default EllipsisTextField;
