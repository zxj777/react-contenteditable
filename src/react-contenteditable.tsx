import * as React from 'react';
import deepEqual from 'fast-deep-equal';
// import * as PropTypes from 'prop-types';

function normalizeHtml(str: string): string {
  return str && str.replace(/&nbsp;|\u202F|\u00A0/g, ' ').replace(/<br \/>/g, '<br>');
}

function replaceCaret(el: HTMLElement) {
  // Place the caret at the end of the element
  const target = document.createTextNode('');
  el.appendChild(target);
  // do not move caret if element was not focused
  const isTargetFocused = document.activeElement === el;
  if (target !== null && target.nodeValue !== null && isTargetFocused) {
    const sel = window.getSelection();
    if (sel !== null) {
      const range = document.createRange();
      range.setStart(target, target.nodeValue.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    if (el instanceof HTMLElement) el.focus();
  }
}

/**
 * A simple component for an html element with editable contents.
 */
export default class ContentEditable extends React.Component<Props> {
  lastValue: string = this.props.value;
  el: any = typeof this.props.innerRef === 'function' ? { current: null } : React.createRef<HTMLElement>();

  getEl = () => (this.props.innerRef && typeof this.props.innerRef !== 'function' ? this.props.innerRef : this.el).current;

  render() {
    const { tagName, value, innerRef, ...props } = this.props;

    return React.createElement(
      tagName || 'div',
      {
        ...props,
        ref: typeof innerRef === 'function' ? (current: HTMLElement) => {
          innerRef(current)
          this.el.current = current
        } : innerRef || this.el,
        onInput: this.emitChange,
        onBlur: this.props.onBlur || this.emitChange,
        onKeyUp: this.props.onKeyUp || this.emitChange,
        onKeyDown: this.props.onKeyDown || this.emitChange,
        contentEditable: !this.props.disabled,
        dangerouslySetInnerHTML: { __html: value }
      },
      this.props.children);
  }

  shouldComponentUpdate(nextProps: Props): boolean {
    const { props } = this;
    const el = this.getEl();

    console.log(el.outerText, 9999)

    console.log('shouldComponentUpdate')

    // We need not rerender if the change of props simply reflects the user's edits.
    // Rerendering in this case would make the cursor/caret jump

    // Rerender if there is no element yet... (somehow?)
    if (!el) return true;

    // ...or if html really changed... (programmatically, not by user edit)
    if (
      nextProps.value  !== el.outerText
      // normalizeHtml(nextProps.html) !== normalizeHtml(el.innerHTML)
    ) {
      return true;
    }

    // Handle additional properties
    return props.disabled !== nextProps.disabled ||
      props.tagName !== nextProps.tagName ||
      props.className !== nextProps.className ||
      props.innerRef !== nextProps.innerRef ||
      props.placeholder !== nextProps.placeholder ||
      !deepEqual(props.style, nextProps.style);
  }

  componentDidUpdate() {
    const el = this.getEl();
    if (!el) return;

    // Perhaps React (whose VDOM gets outdated because we often prevent
    // rerendering) did not update the DOM. So we update it manually now.
    if (this.props.value !== el.outerText) {
      el.outerText = this.props.value;
    }
    this.lastValue = this.props.value;
    replaceCaret(el);
  }

  emitChange = (originalEvt: React.SyntheticEvent<any>) => {
    const el = this.getEl();
    if (!el) return;

    const value = el.outerText;
    if (this.props.onChange && value !== this.lastValue) {
      // Clone event with Object.assign to avoid
      // "Cannot assign to read only property 'target' of object"
      const evt = Object.assign({}, originalEvt, {
        target: {
          value
        }
      });
      this.props.onChange(evt);
    }
    this.lastValue = value;
  }

  // static propTypes = {
  //   // html: PropTypes.string.isRequired,
  //   value: PropTypes.string,
  //   onChange: PropTypes.func,
  //   disabled: PropTypes.bool,
  //   tagName: PropTypes.string,
  //   className: PropTypes.string,
  //   style: PropTypes.object,
  //   innerRef: PropTypes.oneOfType([
  //     PropTypes.object,
  //     PropTypes.func,
  //   ])
  // }
}

export type ContentEditableEvent = React.SyntheticEvent<any, Event> & { target: { value: string } };
type Modify<T, R> = Pick<T, Exclude<keyof T, keyof R>> & R;
type DivProps = Modify<JSX.IntrinsicElements["div"], { onChange: ((event: ContentEditableEvent) => void) }>;

export interface Props extends DivProps {
  disabled?: boolean,
  tagName?: string,
  className?: string,
  value: string,
  style?: Object,
  innerRef?: React.RefObject<HTMLElement> | Function,
}
