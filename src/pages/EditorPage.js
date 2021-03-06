/** @jsx React.DOM */

var React = require('React');
var ReactHack = require('ReactHack');

var Button = require('../components/Button');
var CodeMirrorEditor = require('../components/CodeMirrorEditor');
var ComponentPicker = require('../components/ComponentPicker');
var Layout = require('../layout/Layout');
var Project = require('../data/Project');

var UPDATE_INTERVAL = 1000;

var EditorPage = React.createClass({
  getStateForName: function(componentName) {
    var component = this.project.components[componentName];

    return {
      js: component.js,
      css: component.css,
      example: component.example,
      components: this.project.components,
      lastSaved: new Date()
    };
  },

  getInitialState: function() {
    this.project = Project.get('singleton'); // TODO: support multiple projects
    this.project.autosave(this.handleAutosave);
    this.interval = window.setInterval(this.handleUpdate, UPDATE_INTERVAL);

    return this.getStateForName(this.props.routeParams[0]);
  },

  componentWillUnmount: function() {
    clearInterval(this.interval);
    this.project.unautosave(this.handleAutosave);
  },

  handleUpdate: function() {
    this.project.updateComponent(
      this.props.routeParams[0],
      this.state.js,
      this.state.css,
      this.state.example
    );
  },

  handleNew: function(name) {
    this.project.createComponent(name);
    this.setState({components: this.project.components});
    window.location.hash = '#' + name;
  },

  handleAutosave: function() {
    this.setState({lastSaved: new Date()});
  },

  handleCSSChange: function(css) {
    this.setState({css: css});
  },

  handleJSChange: function(js) {
    this.setState({js: js});
  },

  handleExampleChange: function(example) {
    this.setState({example: example});
  },

  componentWillReceiveProps: function(nextProps, nextState) {
    if (this.props.routeParams[0] !== nextProps.routeParams[0]) {
      console.log('updating', nextProps.routeParams[0]);
      this.setState(this.getStateForName(nextProps.routeParams[0]));
    }
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (
        this.state.js !== prevState.js ||
        this.state.example !== prevState.example ||
        this.state.css !== prevState.css) {
      this.execute();
    }
  },

  componentDidMount: function() {
    var doc = this.refs.preview.getDOMNode().contentDocument;
    var reactScript = doc.createElement('script');
    reactScript.src = 'static/react-0.5.1.js';
    doc.documentElement.appendChild(reactScript);
    doc.documentElement.style.backgroundColor = '#f8f5ec';

    this.contentDiv = doc.createElement('div');
    this.contentDiv.id = '__reactpad_content';
    doc.body.appendChild(this.contentDiv);

    this.messageDiv = doc.createElement('div');
    this.messageDiv.id = '__reactpad_message';
    this.messageDiv.style.display = 'none';
    this.messageDiv.style.border = '1px solid red';
    this.messageDiv.style.margin = '10px';
    this.messageDiv.style.padding = '10px';
    this.messageDiv.style.textAlign = 'center';
    doc.body.appendChild(this.messageDiv);

    this.execute();
  },

  execute: function() {
    if (!this.refs.preview.getDOMNode().contentWindow.React) {
      setTimeout(this.execute, 100);
      return;
    }
    try {
      var transformedSrc = JSXTransformer.transform(
        '/** @jsx React.DOM */ var examples = [];var messageDiv = document.getElementById("__reactpad_message");' +
        'try {\n' +
        this.state.js + '\n' +
        this.state.example + '\n' +
        '  var contentDiv = document.getElementById("__reactpad_content");\n' +
        '  examples.forEach(function(e) {\n' +
        '    var c = document.createElement("div");\n' +
        '    contentDiv.appendChild(c);\n' +
        '    React.renderComponent(e, c);\n' +
        '  });' +
        '} catch (e) {' +
        '  messageDiv.innerText = e.toString();\n' +
        '  messageDiv.style.display = "block";\n' +
        '}\n'
      ).code;
    } catch (e) {
      this.messageDiv.innerText = e.toString();
      this.messageDiv.style.display = 'block';
      return;
    }


    var doc = this.refs.preview.getDOMNode().contentDocument;
    this.contentDiv.innerHTML = '';
    this.messageDiv.innerText = '';
    this.messageDiv.style.display = 'none';

    Array.prototype.slice.call(doc.querySelectorAll('style')).forEach(function(child) {
      child.parentNode.removeChild(child);
    });

    var stylesheet = doc.createElement('style');
    stylesheet.type = 'text/css';
    stylesheet.appendChild(doc.createTextNode(this.state.css));

    var srcScript = doc.createElement('script');

    srcScript.text = transformedSrc;

    doc.documentElement.appendChild(stylesheet);
    doc.documentElement.appendChild(srcScript);
  },

  render: function() {
    var componentName = this.props.routeParams[0];

    return (
      <Layout lastSaved={this.state.lastSaved}>
        <div className="row">
          <div className="span2">
            <ComponentPicker components={this.state.components} current={componentName} onNew={this.handleNew} />
          </div>
          <div className="span10">
            <div className="row">
              <div className="span5">
                <h4>CSS</h4>
                <CodeMirrorEditor
                  width="100%"
                  height="100px"
                  mode="css"
                  codeText={this.state.css}
                  onChange={this.handleCSSChange}
                />
              </div>
              <div className="span5">
                <h4>Example code</h4>
                <CodeMirrorEditor
                  width="100%"
                  height="100px"
                  mode="javascript"
                  codeText={this.state.example}
                  onChange={this.handleExampleChange}
                />
              </div>
            </div>
            <div className="row">
              <div className="span5">
                <h4>JavaScript</h4>
                <CodeMirrorEditor
                  width="100%"
                  height="300px"
                  mode="javascript"
                  codeText={this.state.js}
                  onChange={this.handleJSChange}
                />
              </div>
              <div className="span5">
                <h4>Preview</h4>
                <iframe ref="preview" style={{width: '100%', height: 300}} frameBorder="0" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
});

module.exports = EditorPage;