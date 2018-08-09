/*!
 * trancate-html v1.0.0
 * Copyright© 2018 Saiya https://github.com/evecalm/truncate-html#readme
 */
import { load } from 'cheerio'

// default options
var defaultOptions = {
  // remove all tags
  stripTags: false,
  // postfix of the string
  ellipsis: '...',
  // decode html entities
  decodeEntities: false,
  // whether truncate by words
  byWords: false,
  // // truncate by words, set to true keep words
  // // set to number then truncate by word count
  // length: 0
  excludes: '',
  reserveLastWord: false,
  keepWhitespaces: false // even if set true, continuous whitespace will count as one
}
// helper method
var helper = {
  setup: function setup(length, options) {
    switch (typeof length) {
      case 'object':
        options = length
        break
      case 'number':
        if (typeof options === 'object') {
          options.length = length
        } else {
          options = {
            length: length
          }
        }
    }
    var lenType = typeof options.length
    if (lenType !== 'undefined' && lenType !== 'number') {
      throw new TypeError('truncate-html: options.length should be a number')
    }
    var fullOptions = this.extend(options, defaultOptions)
    if (fullOptions.excludes) {
      if (!Array.isArray(fullOptions.excludes)) {
        fullOptions.excludes = [fullOptions.excludes]
      }
      fullOptions.excludes = fullOptions.excludes.join(',')
    }
    this.options = fullOptions
    this.limit = fullOptions.length
    this.ellipsis = fullOptions.ellipsis
    this.keepWhitespaces = fullOptions.keepWhitespaces
    this.reserveLastWord = fullOptions.reserveLastWord
  },
  // extend obj with dft
  extend: function extend(obj, dft) {
    if (obj == null) {
      obj = {}
    }
    for (var k in dft) {
      var v = dft[k]
      if (obj[k] != null) {
        continue
      }
      obj[k] = v
    }
    return obj
  },
  // test a char whether a whitespace char
  isBlank: function isBlank(char) {
    return (
      char === ' ' ||
      char === '\f' ||
      char === '\n' ||
      char === '\r' ||
      char === '\t' ||
      char === '\v' ||
      char === '\u00A0' ||
      char === '\u2028' ||
      char === '\u2029'
    )
  },
  /**
   * truncate text
   * @param  {String}  text        text to truncate
   * @param  {Boolean} isLastNode  is last dom node, help to decide whether add ellipsis
   * @return {String}
   */
  truncate: function truncate(text, isLastNode) {
    var this$1 = this

    if (!this.keepWhitespaces) {
      text = text.replace(/\s+/g, ' ')
    }
    var byWords = this.options.byWords
    var strLen = text.length
    var idx = 0
    var count = 0
    var prevIsBlank = byWords
    var curIsBlank = false
    while (idx < strLen) {
      curIsBlank = this$1.isBlank(text.charAt(idx++))
      // keep same then continue
      if (byWords && prevIsBlank === curIsBlank) {
        continue
      }
      if (count === this$1.limit) {
        // reserve trailing whitespace
        if (curIsBlank) {
          prevIsBlank = curIsBlank
          continue
        }
        // fix idx because current char belong to next words which exceed the limit
        --idx
        break
      }
      if (byWords) {
        curIsBlank || ++count
      } else {
        ;(curIsBlank && prevIsBlank) || ++count
      }
      prevIsBlank = curIsBlank
    }
    this.limit -= count
    if (this.limit) {
      return text
    } else {
      var str
      if (byWords) {
        str = text.substr(0, idx)
      } else {
        str = this.substr(text, idx)
      }
      if (str === text) {
        // if is lat node, no need of ellipsis, or add it
        return isLastNode ? text : text + this.ellipsis
      } else {
        return str + this.ellipsis
      }
    }
  },
  // deal with cut string in the middle of a word
  substr: function substr(str, len) {
    // var boundary, cutted, result
    var cutted = str.substr(0, len)
    if (!this.reserveLastWord) {
      return cutted
    }
    var boundary = str.substring(len - 1, len + 1)
    // if truncate at word boundary, just return
    if (/\W/.test(boundary)) {
      return cutted
    }
    if (this.reserveLastWord < 0) {
      var result = cutted.replace(/\w+$/, '')
      // if the cutted is not the first and the only word
      //   then return result, or return the whole word
      if (!(result.length === 0 && cutted.length === this.options.length)) {
        return result
      }
    }
    // set max exceeded to 10 if this.reserveLastWord is true or > 0
    var maxExceeded =
      this.reserveLastWord !== true && this.reserveLastWord > 0
        ? this.reserveLastWord
        : 10
    var mtc = str.substr(len).match(/(\w+)/)
    var exceeded = mtc ? mtc[1] : ''
    return cutted + exceeded.substr(0, maxExceeded)
  }
}
/** return true if elem is CheerioStatic */
function isCheerioInstance(elem) {
  return (
    elem &&
    typeof elem === 'object' &&
    elem.root &&
    elem.contains &&
    elem.html &&
    elem.parseHTML
  )
}
/**
 * truncate html
 * @method truncate(html, [length], [options])
 * @param  {String}         html    html string to truncate
 * @param  {Object|number}  length how many letters(words if `byWords` is true) you want reserve
 * @param  {Object|null}    options
 * @return {String}
 */
var truncate = function(html, length, options) {
  if (typeof length !== 'undefined') {
    helper.setup(length, options)
  }
  if (!html || isNaN(helper.limit) || helper.limit <= 0) {
    return html
  }
  if (typeof helper.options.length === 'undefined') {
    throw new TypeError('truncate-html: options.length has not been set')
  }
  // if (helper.limit)
  var $
  // support provied cheerio
  if (isCheerioInstance(html)) {
    $ = html
  } else {
    // Add a wrapper for text node without tag like:
    //   <p>Lorem ipsum <p>dolor sit => <div><p>Lorem ipsum <p>dolor sit</div>
    $ = load('' + html, {
      decodeEntities: helper.options.decodeEntities
    })
  }
  var $html = $.root()
  // remove excludes elements
  helper.options.excludes && $html.find(helper.options.excludes).remove()
  // strip tags and get pure text
  if (helper.options.stripTags) {
    return helper.truncate($html.text())
  }
  var travelChildren = function($ele, isParentLastNode) {
    if (isParentLastNode === void 0) isParentLastNode = true

    var contents = $ele.contents()
    var lastIdx = contents.length - 1
    return contents.each(function(idx) {
      switch (this.type) {
        case 'text':
          if (!helper.limit) {
            $(this).remove()
            return
          }
          this.data = helper.truncate(
            $(this).text(),
            isParentLastNode && idx === lastIdx
          )
          break
        case 'tag':
          if (!helper.limit) {
            $(this).remove()
          } else {
            return travelChildren($(this), isParentLastNode && idx === lastIdx)
          }
          break
        default:
          // for comments
          return $(this).remove()
      }
    })
  }
  travelChildren($html)
  return $html.html()
}
truncate.setup = function(options) {
  if (options === void 0) options = {}

  return Object.assign(defaultOptions, options)
}

export default truncate
