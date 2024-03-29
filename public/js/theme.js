window.relearn = window.relearn || {};

var theme = true;
var isIE = /*@cc_on!@*/false || !!document.documentMode;
if( isIE ){
    // we don't support sidebar flyout in IE
    document.querySelector( 'body' ).classList.remove( 'mobile-support' );
}
else{
    document.querySelector( 'body' ).classList.add( 'mobile-support' );
}
var isPrint = document.querySelector( 'body' ).classList.contains( 'print' );

var touchsupport = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)

var formelements = 'button, datalist, fieldset, input, label, legend, meter, optgroup, option, output, progress, select, textarea';

// rapidoc: #280 disable broad document syntax highlightning
window.Prism = window.Prism || {};
Prism.manual = true;

// PerfectScrollbar
var psc;
var psm;
var pst;
var elc = document.querySelector('#body-inner');

function documentFocus(){
    document.querySelector( '#body-inner' ).focus();
    psc && psc.scrollbarY.focus();
}

function scrollbarWidth(){
    // https://davidwalsh.name/detect-scrollbar-width
    // Create the measurement node
    var scrollDiv = document.createElement("div");
    scrollDiv.className = "scrollbar-measure";
    document.body.appendChild(scrollDiv);
    // Get the scrollbar width
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    // Delete the DIV
    document.body.removeChild(scrollDiv);
    return scrollbarWidth;
}

var scrollbarSize = scrollbarWidth();
function adjustContentWidth(){
    var left = parseFloat( getComputedStyle( elc ).getPropertyValue( 'padding-left' ) );
    var right = left;
    if( elc.scrollHeight > elc.clientHeight ){
        // if we have a scrollbar reduce the right margin by the scrollbar width
        right = Math.max( 0, left - scrollbarSize );
    }
    elc.style[ 'padding-right' ] = '' + right + 'px';
}

function switchTab(tabGroup, tabId) {
    var tabs = Array.from( document.querySelectorAll( '.tab-panel[data-tab-group="'+tabGroup+'"]' ) ).filter( function( e ){
        return !!e.querySelector( '[data-tab-item="'+tabId+'"]' );
    });
    var allTabItems = tabs && tabs.reduce( function( a, e ){
        return a.concat( Array.from( e.querySelectorAll( '.tab-nav-button, .tab-item' ) ) );
    }, [] );
    var targetTabItems = tabs && tabs.reduce( function( a, e ){
        return a.concat( Array.from( e.querySelectorAll( '[data-tab-item="'+tabId+'"]' ) ) );
    }, [] );

    // if event is undefined then switchTab was called from restoreTabSelection
    // so it's not a button event and we don't need to safe the selction or
    // prevent page jump
    var isButtonEvent = event != undefined;

    if(isButtonEvent){
      // save button position relative to viewport
      var yposButton = event.target.getBoundingClientRect().top;
    }

    allTabItems && allTabItems.forEach( function( e ){ e.classList.remove( 'active' ); });
    targetTabItems && targetTabItems.forEach( function( e ){ e.classList.add( 'active' ); });

    if(isButtonEvent){
      // reset screen to the same position relative to clicked button to prevent page jump
      var yposButtonDiff = event.target.getBoundingClientRect().top - yposButton;
      window.scrollTo(window.scrollX, window.scrollY+yposButtonDiff);

      // Store the selection to make it persistent
      if(window.localStorage){
          var selectionsJSON = window.localStorage.getItem(baseUriFull+"tab-selections");
          if(selectionsJSON){
            var tabSelections = JSON.parse(selectionsJSON);
          }else{
            var tabSelections = {};
          }
          tabSelections[tabGroup] = tabId;
          window.localStorage.setItem(baseUriFull+"tab-selections", JSON.stringify(tabSelections));
      }
    }
}

function restoreTabSelections() {
    if(window.localStorage){
        var selectionsJSON = window.localStorage.getItem(baseUriFull+"tab-selections");
        if(selectionsJSON){
          var tabSelections = JSON.parse(selectionsJSON);
        }else{
          var tabSelections = {};
        }
        Object.keys(tabSelections).forEach(function(tabGroup) {
          var tabItem = tabSelections[tabGroup];
          switchTab(tabGroup, tabItem);
        });
    }
}

function initMermaid( update, attrs ) {
    // we are either in update or initialization mode;
    // during initialization, we want to edit the DOM;
    // during update we only want to execute if something changed
    var decodeHTML = function( html ){
        var txt = document.createElement( 'textarea' );
        txt.innerHTML = html;
        return txt.value;
    };

    var parseGraph = function( graph ){
        var d = /^\s*(%%\s*\{\s*\w+\s*:([^%]*?)%%\s*\n?)/g;
        var m = d.exec( graph );
        var dir = {};
        var content = graph;
        if( m && m.length == 3 ){
            dir = JSON.parse( '{ "dummy": ' + m[2] ).dummy;
            content = graph.substring( d.lastIndex );
        }
        content = content.trim();
        return { dir: dir, content: content };
    };

    var serializeGraph = function( graph ){
        var s = '%%{init: ' + JSON.stringify( graph.dir ) + '}%%\n';
        s += graph.content;
        return s;
    };

    var init_func = function( attrs ){
        var is_initialized = false;
        var theme = attrs.theme;
        document.querySelectorAll('.mermaid').forEach( function( element ){
            var parse = parseGraph( decodeHTML( element.innerHTML ) );

            if( parse.dir.theme ){
                parse.dir.relearn_user_theme = true;
            }
            if( !parse.dir.relearn_user_theme ){
                parse.dir.theme = theme;
            }
            is_initialized = true;

            var graph = serializeGraph( parse );
            element.innerHTML = graph;
            var new_element = document.createElement( 'div' );
            new_element.classList.add( 'mermaid-container' );
            new_element.innerHTML = '<div class="mermaid-code">' + graph + '</div>' + element.outerHTML;
            element.parentNode.replaceChild( new_element, element );
        });
        return is_initialized;
    }

    var update_func = function( attrs ){
        var is_initialized = false;
        var theme = attrs.theme;
        document.querySelectorAll( '.mermaid-container' ).forEach( function( e ){
            var element = e.querySelector( '.mermaid' );
            var code = e.querySelector( '.mermaid-code' );
            var parse = parseGraph( decodeHTML( code.innerHTML ) );

            if( parse.dir.relearn_user_theme ){
                return;
            }
            if( parse.dir.theme == theme ){
                return;
            }
            is_initialized = true;

            parse.dir.theme = theme;
            var graph = serializeGraph( parse );
            element.removeAttribute('data-processed');
            element.innerHTML = graph;
            code.innerHTML = graph;
        });
        return is_initialized;
    };

    var state = this;
    if( update && !state.is_initialized ){
        return;
    }
    if( typeof variants == 'undefined' ){
        return;
    }
    if( typeof mermaid == 'undefined' || typeof mermaid.mermaidAPI == 'undefined' ){
        return;
    }

    if( !state.is_initialized ){
        state.is_initialized = true;
        window.addEventListener( 'beforeprint', function(){
            initMermaid( true, {
                'theme': variants.getColorValue( 'PRINT-MERMAID-theme' ),
            });
		}.bind( this ) );
		window.addEventListener( 'afterprint', function(){
            initMermaid( true );
		}.bind( this ) );
    }

    attrs = attrs || {
        'theme': variants.getColorValue( 'MERMAID-theme' ),
    };
    var is_initialized = ( update ? update_func( attrs ) : init_func( attrs ) );
    if( is_initialized ){
        mermaid.init();
        $(".mermaid svg").svgPanZoom({});
    }
}

function initSwagger( update, attrs ){
    var state = this;
    if( update && !state.is_initialized ){
        return;
    }
    if( typeof variants == 'undefined' ){
        return;
    }

    if( !state.is_initialized ){
        state.is_initialized = true;
        window.addEventListener( 'beforeprint', function(){
            initSwagger( true, {
                'bg-color': variants.getColorValue( 'PRINT-MAIN-BG-color' ),
                'mono-font': variants.getColorValue( 'PRINT-CODE-font' ),
                'primary-color': variants.getColorValue( 'PRINT-TAG-BG-color' ),
                'regular-font': variants.getColorValue( 'PRINT-MAIN-font' ),
                'text-color': variants.getColorValue( 'PRINT-MAIN-TEXT-color' ),
                'theme': variants.getColorValue( 'PRINT-SWAGGER-theme' ),
            });
        }.bind( this ) );
        window.addEventListener( 'afterprint', function(){
            initSwagger( true );
        }.bind( this ) );
    }

    attrs = attrs || {
        'bg-color': variants.getColorValue( 'MAIN-BG-color' ),
        'mono-font': variants.getColorValue( 'CODE-font' ),
        'primary-color': variants.getColorValue( 'TAG-BG-color' ),
        'regular-font': variants.getColorValue( 'MAIN-font' ),
        'text-color': variants.getColorValue( 'MAIN-TEXT-color' ),
        'theme': variants.getColorValue( 'SWAGGER-theme' ),
    };
    document.querySelectorAll( 'rapi-doc' ).forEach( function( e ){
        Object.keys( attrs ).forEach( function( key ){
            /* this doesn't work for FF 102, maybe related to custom elements? */
            e.setAttribute( key, attrs[key] );
        });
    });
}

function initAnchorClipboard(){
    document.querySelectorAll( 'h1~h2,h1~h3,h1~h4,h1~h5,h1~h6').forEach( function( element ){
        var url = encodeURI(document.location.origin + document.location.pathname);
        var link = url + "#"+element.id;
        var new_element = document.createElement( 'span' );
        new_element.classList.add( 'anchor' );
        new_element.setAttribute( 'title', window.T_Copy_link_to_clipboard );
        new_element.setAttribute( 'data-clipboard-text', link );
        new_element.innerHTML = '<i class="fas fa-link fa-lg"></i>';
        element.appendChild( new_element );
    });

    $(".anchor").on('mouseleave', function(e) {
        $(this).attr('aria-label', null).removeClass('tooltipped tooltipped-se tooltipped-sw');
    });

    var clip = new ClipboardJS('.anchor');
    clip.on('success', function(e) {
        e.clearSelection();
        var rtl = $(e.trigger).closest('*[dir]').attr('dir') == 'rtl';
        $(e.trigger).attr('aria-label', window.T_Link_copied_to_clipboard).addClass('tooltipped tooltipped-s'+(rtl?'e':'w') );
    });
}

function initCodeClipboard(){
    function fallbackMessage(action) {
        var actionMsg = '';
        var actionKey = (action === 'cut' ? 'X' : 'C');

        if (/iPhone|iPad/i.test(navigator.userAgent)) {
            actionMsg = 'No support :(';
        }
        else if (/Mac/i.test(navigator.userAgent)) {
            actionMsg = 'Press ⌘-' + actionKey + ' to ' + action;
        }
        else {
            actionMsg = 'Press Ctrl-' + actionKey + ' to ' + action;
        }

        return actionMsg;
    }

    $('code').each(function() {
        var code = $(this);
        var text = code.text();
        var parent = code.parent();
        var inPre = parent.prop('tagName') == 'PRE';

        if (inPre || text.length > 5) {
            var clip = new ClipboardJS('.copy-to-clipboard-button', {
                text: function(trigger) {
                    var text = $(trigger).prev('code').text();
                    // remove a trailing line break, this may most likely
                    // come from the browser / Hugo transformation
                    text = text.replace(/\n$/, '');
                    // removes leading $ signs from text in an assumption
                    // that this has to be the unix prompt marker - weird
                    return text.replace(/^\$\s/gm, '');
                }
            });

            clip.on('success', function(e) {
                e.clearSelection();
                var inPre = $(e.trigger).parent().prop('tagName') == 'PRE';
                var rtl = $(e.trigger).closest('*[dir]').attr('dir') == 'rtl';
                $(e.trigger).attr('aria-label', window.T_Copied_to_clipboard).addClass('tooltipped tooltipped-' + (inPre ? 'w' : 's'+(rtl?'e':'w')));
            });

            clip.on('error', function(e) {
                var inPre = $(e.trigger).parent().prop('tagName') == 'PRE';
                var rtl = $(this).closest('*[dir]').attr('dir') == 'rtl';
                $(e.trigger).attr('aria-label', fallbackMessage(e.action)).addClass('tooltipped tooltipped-' + (inPre ? 'w' : 's'+(rtl?'e':'w')));
                $(document).one('copy', function(){
                    $(e.trigger).attr('aria-label', window.T_Copied_to_clipboard).addClass('tooltipped tooltipped-' + (inPre ? 'w' : 's'+(rtl?'e':'w')));
                });
            });

            code.addClass('copy-to-clipboard-code');
            if( inPre ){
                parent.addClass( 'copy-to-clipboard' ).addClass( 'pre-code' );
            }
            else{
                code.replaceWith($('<span/>', {'class': 'copy-to-clipboard'}).append(code.clone() ));
                code = parent.children('.copy-to-clipboard').last().children('.copy-to-clipboard-code');
            }
            code.after( $('<span>').addClass("copy-to-clipboard-button").attr("title", window.T_Copy_to_clipboard).append("<i class='fas fa-copy'></i>") );
            code.next('.copy-to-clipboard-button').on('mouseleave', function() {
                var rtl = $(this).closest('*[dir]').attr('dir') == 'rtl';
                $(this).attr('aria-label', null).removeClass('tooltipped tooltipped-w tooltipped-se tooltipped-sw');
            });
        }
    });
}

function initArrowNav(){
    if( isPrint ){
        return;
    }

    // button navigation
    var e = document.querySelector( 'a.nav-prev' );
    e && e.addEventListener( 'click', navPrev );
    e = document.querySelector( 'a.nav-next' );
    e && e.addEventListener( 'click', navNext );

    // keyboard navigation
    // avoid prev/next navigation if we are not at the start/end of the
    // horizontal area
    var el = document.querySelector('#body-inner');
    var scrollLeft = 0;
    var scrollRight = 0;
    document.addEventListener('keydown', function(event){
        if( !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey ){
            if( event.which == '37' ){
                if( !scrollLeft && el.scrollLeft <= 0 ){
                    navPrev();
                }
                else if( scrollLeft != -1 ){
                    clearTimeout( scrollLeft );
                }
                scrollLeft = -1;
            }
            if( event.which == '39' ){
                if( !scrollRight && el.scrollLeft + el.clientWidth >= el.scrollWidth ){
                    navNext();
                }
                else if( scrollRight != -1 ){
                    clearTimeout( scrollRight );
                }
                scrollRight = -1;
            }
        }
    });
    document.addEventListener('keyup', function(event){
        if( !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey ){
            if( event.which == '37' ){
                // check for false indication if keyup is delayed after navigation
                if( scrollLeft == -1 ){
                    scrollLeft = setTimeout( function(){ scrollLeft = 0; }, 300 );
                }
            }
            if( event.which == '39' ){
                if( scrollRight == -1 ){
                    scrollRight = setTimeout( function(){ scrollRight = 0; }, 300 );
                }
            }
        }
    });

    // avoid keyboard navigation for input fields
    document.querySelectorAll( formelements ).forEach( function( e ){
        e.addEventListener( 'keydown', function( event ){
            if( event.which == 37 || event.which == 39 ){
                event.stopPropagation();
            }
        });
    });
}

function initMenuScrollbar(){
    if( isPrint ){
        return;
    }

    var elm = document.querySelector('#content-wrapper');
    var elt = document.querySelector('#TableOfContents');

    var autofocus = true;
    document.addEventListener('keydown', function(event){
        // for initial keyboard scrolling support, no element
        // may be hovered, but we still want to react on
        // cursor/page up/down. because we can't hack
        // the scrollbars implementation, we try to trick
        // it and give focus to the scrollbar - only
        // to just remove the focus right after scrolling
        // happend
        autofocus = false;
        if( event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.which < 32 || event.which > 40 ){
            // if tab key was pressed, we are ended with our initial
            // focus job
            return;
        }

        var c = elc && elc.matches(':hover');
        var m = elm && elm.matches(':hover');
        var t = elt && elt.matches(':hover');
        var f = event.target.matches( formelements );
        if( !c && !m && !t && !f ){
            // only do this hack if none of our scrollbars
            // is hovered
            // if we are showing the sidebar as a flyout we
            // want to scroll the content-wrapper, otherwise we want
            // to scroll the body
            var nt = document.querySelector('body').matches('.toc-flyout');
            var nm = document.querySelector('body').matches('.sidebar-flyout');
            if( nt ){
                pst && pst.scrollbarY.focus();
            }
            else if( nm ){
                psm && psm.scrollbarY.focus();
            }
            else{
                document.querySelector('#body-inner').focus();
                psc && psc.scrollbarY.focus();
            }
        }
    });
    // scrollbars will install their own keyboard handlers
    // that need to be executed inbetween our own handlers
    // PSC removed for #242 #243 #244
    // psc = elc && new PerfectScrollbar('#body-inner');
    psm = elm && new PerfectScrollbar('#content-wrapper');
    pst = elt && new PerfectScrollbar('#TableOfContents');
    document.addEventListener('keydown', function(){
        // if we facked initial scrolling, we want to
        // remove the focus to not leave visual markers on
        // the scrollbar
        if( autofocus ){
            psc && psc.scrollbarY.blur();
            psm && psm.scrollbarY.blur();
            pst && pst.scrollbarY.blur();
            autofocus = false;
        }
    });
    // on resize, we have to redraw the scrollbars to let new height
    // affect their size
    window.addEventListener('resize', function(){
        pst && pst.update();
        psm && psm.update();
        psc && psc.update();
    });
    // now that we may have collapsible menus, we need to call a resize
    // for the menu scrollbar if sections are expanded/collapsed
    document.querySelectorAll('#sidebar .collapsible-menu input.toggle').forEach( function(e){
        e.addEventListener('change', function(){
            psm && psm.update();
        });
    });

    // finally, we want to adjust the contents right padding if there is a scrollbar visible
    window.addEventListener('resize', adjustContentWidth );
    adjustContentWidth();
}

function sidebarEscapeHandler( event ){
    if( event.key == "Escape" ){
        var b = document.querySelector( 'body' );
        b.classList.remove( 'sidebar-flyout' );
        document.removeEventListener( 'keydown', sidebarEscapeHandler );
        documentFocus();
    }
}

function tocEscapeHandler( event ){
    if( event.key == "Escape" ){
        var b = document.querySelector( 'body' );
        b.classList.remove( 'toc-flyout' );
        document.removeEventListener( 'keydown', tocEscapeHandler );
        documentFocus();
    }
}

function sidebarShortcutHandler( event ){
    if( !event.shiftKey && event.altKey && event.ctrlKey && !event.metaKey && event.which == 78 /* n */ ){
        showNav();
    }
}

function searchShortcutHandler( event ){
    if( !event.shiftKey && event.altKey && event.ctrlKey && !event.metaKey && event.which == 70 /* f */ ){
        showSearch();
    }
}

function tocShortcutHandler( event ){
    if( !event.shiftKey && event.altKey && event.ctrlKey && !event.metaKey && event.which == 84 /* t */ ){
        showToc();
    }
}

function editShortcutHandler( event ){
    if( !event.shiftKey && event.altKey && event.ctrlKey && !event.metaKey && event.which == 87 /* w */ ){
        showEdit();
    }
}

function printShortcutHandler( event ){
    if( !event.shiftKey && event.altKey && event.ctrlKey && !event.metaKey && event.which == 80 /* p */ ){
        showPrint();
    }
}

function showSearch(){
    var s = document.querySelector( '#search-by' );
    if( !s ){
        return;
    }
    var b = document.querySelector( 'body' );
    if( s == document.activeElement ){
        if( b.classList.contains( 'sidebar-flyout' ) ){
            showNav();
        }
        documentFocus();
    } else {
        if( !b.classList.contains( 'sidebar-flyout' ) ){
            showNav();
        }
        s.focus();
    }
}

function showNav(){
    if( !document.querySelector( '#sidebar-overlay' ) ){
        // we may not have a flyout
        return;
    }
    var b = document.querySelector( 'body' );
    b.classList.toggle( 'sidebar-flyout' );
    if( b.classList.contains( 'sidebar-flyout' ) ){
        b.classList.remove( 'toc-flyout' );
        document.removeEventListener( 'keydown', tocEscapeHandler );
        document.addEventListener( 'keydown', sidebarEscapeHandler );
    }
    else{
        document.removeEventListener( 'keydown', sidebarEscapeHandler );
        documentFocus();
    }
}

function showToc(){
    var t = document.querySelector( '#toc-menu' );
    if( !t ){
        // we may not have a toc
        return;
    }
    var b = document.querySelector( 'body' );
    b.classList.toggle( 'toc-flyout' );
    if( b.classList.contains( 'toc-flyout' ) ){
        pst && pst.update();
        pst && pst.scrollbarY.focus();
        document.querySelector( '.toc-wrapper ul a' ).focus();
        document.addEventListener( 'keydown', tocEscapeHandler );
    }
    else{
        document.removeEventListener( 'keydown', tocEscapeHandler );
        documentFocus();
    }
}

function showEdit(){
    var l = document.querySelector( '#top-github-link a' );
    if( l ){
        l.click();
    }
}

function showPrint(){
    var l = document.querySelector( '#top-print-link a' );
    if( l ){
        l.click();
    }
}

function navPrev(){
    var e = document.querySelector( 'a.nav-prev' );
    location.href = e && e.getAttribute( 'href' );
};

function navNext(){
    var e = document.querySelector( 'a.nav-next' );
    location.href = e && e.getAttribute( 'href' );
};

function initToc(){
    if( isPrint ){
        return;
    }

    document.addEventListener( 'keydown', editShortcutHandler );
    document.addEventListener( 'keydown', printShortcutHandler );
    document.addEventListener( 'keydown', sidebarShortcutHandler );
    document.addEventListener( 'keydown', searchShortcutHandler );
    document.addEventListener( 'keydown', tocShortcutHandler );

    document.querySelector( '#sidebar-overlay' ).addEventListener( 'click', showNav );
    document.querySelector( '#sidebar-toggle' ).addEventListener( 'click', showNav );
    document.querySelector( '#toc-overlay' ).addEventListener( 'click', showToc );
    var t = document.querySelector( '#toc-menu' );
    var p = document.querySelector( '.progress' );
    if( t && p ){
        // we may not have a toc
        t.addEventListener( 'click', showToc );
        p.addEventListener( 'click', showToc );
    }

    // finally give initial focus to allow keyboard scrolling in FF
    documentFocus();
}

function initSwipeHandler(){
    if( !touchsupport ){
        return;
    }

    var startx = null;
    var starty = null;
    var handleStartX = function(evt) {
        startx = evt.touches[0].clientX;
        starty = evt.touches[0].clientY;
        return false;
    };
    var handleMoveX = function(evt) {
        if( startx !== null ){
            var diffx = startx - evt.touches[0].clientX;
            var diffy = starty - evt.touches[0].clientY || .1 ;
            if( diffx / Math.abs( diffy ) < 2 ){
                // detect mostly vertical swipes and reset our starting pos
                // to not detect a horizontal move if vertical swipe is unprecise
                startx = evt.touches[0].clientX;
            }
            else if( diffx > 30 ){
                startx = null;
                starty = null;
                var b = document.querySelector( 'body' );
                b.classList.remove( 'sidebar-flyout' );
                document.removeEventListener( 'keydown', sidebarEscapeHandler );
                documentFocus();
            }
        }
        return false;
    };
    var handleEndX = function(evt) {
        startx = null;
        starty = null;
        return false;
    };

    document.querySelector( '#sidebar-overlay' ).addEventListener("touchstart", handleStartX, false);
    document.querySelector( '#sidebar' ).addEventListener("touchstart", handleStartX, false);
    document.querySelectorAll( '#sidebar *' ).forEach( function(e){ e.addEventListener("touchstart", handleStartX); }, false);
    document.querySelector( '#sidebar-overlay' ).addEventListener("touchmove", handleMoveX, false);
    document.querySelector( '#sidebar' ).addEventListener("touchmove", handleMoveX, false);
    document.querySelectorAll( '#sidebar *' ).forEach( function(e){ e.addEventListener("touchmove", handleMoveX); }, false);
    document.querySelector( '#sidebar-overlay' ).addEventListener("touchend", handleEndX, false);
    document.querySelector( '#sidebar' ).addEventListener("touchend", handleEndX, false);
    document.querySelectorAll( '#sidebar *' ).forEach( function(e){ e.addEventListener("touchend", handleEndX); }, false);
}

function clearHistory() {
    var visitedItem = baseUriFull + 'visited-url/'
    for( var item in sessionStorage ){
        if( item.substring( 0, visitedItem.length ) === visitedItem ){
            sessionStorage.removeItem( item );
            var url = item.substring( visitedItem.length );
            // in case we have `relativeURLs=true` we have to strip the
            // relative path to root
            url = url.replace( /\.\.\//g, '/' ).replace( /^\/+\//, '/' );
            document.querySelectorAll( '[data-nav-id="'+url+'"]' ).forEach( function( e ){
                e.classList.remove( 'visited' );
            });
        }
    }
}

function initHistory() {
    var visitedItem = baseUriFull + 'visited-url/'
    sessionStorage.setItem( visitedItem+document.querySelector( 'body' ).dataset.url, 1);

    // loop through the sessionStorage and see if something should be marked as visited
    for( var item in sessionStorage ){
        if( item.substring( 0, visitedItem.length ) === visitedItem && sessionStorage.getItem( item ) == 1 ){
            var url = item.substring( visitedItem.length );
            // in case we have `relativeURLs=true` we have to strip the
            // relative path to root
            url = url.replace( /\.\.\//g, '/' ).replace( /^\/+\//, '/' );
            document.querySelectorAll( '[data-nav-id="'+url+'"]' ).forEach( function( e ){
                e.classList.add( 'visited' );
            });
        }
    }
}

function scrollToActiveMenu() {
    window.setTimeout(function(){
        var e = document.querySelector( '#sidebar ul.topics li.active a' );
        if( e && e.scrollIntoView ){
            e.scrollIntoView({
                block: 'center',
            });
        }
    }, 10);
}

function scrollToFragment() {
    if( !window.location.hash || window.location.hash.length <= 1 ){
        return;
    }
    window.setTimeout(function(){
        var e = document.querySelector( window.location.hash );
        if( e && e.scrollIntoView ){
            e.scrollIntoView({
                block: 'start',
            });
        }
    }, 10);
}

function mark() {
	// mark some additional stuff as searchable
	var topbarLinks = document.querySelectorAll( '#topbar a:not(:has(img)):not(.btn)' );
	for( var i = 0; i < topbarLinks.length; i++ ){
		topbarLinks[i].classList.add( 'highlight' );
	}

	var bodyInnerLinks = document.querySelectorAll( '#body-inner a:not(:has(img)):not(.btn):not(.lightbox):not(a[rel="footnote"])' );
	for( var i = 0; i < bodyInnerLinks.length; i++ ){
		bodyInnerLinks[i].classList.add( 'highlight' );
	}

	var value = sessionStorage.getItem( baseUriFull + 'search-value' );
    var highlightableElements = document.querySelectorAll( '.highlightable' );
    highlight( highlightableElements, value, { element: 'mark' } );

	var markedElements = document.querySelectorAll( 'mark' );
	for( var i = 0; i < markedElements.length; i++ ){
		var parent = markedElements[i].parentNode;
		while( parent && parent.classList ){
			if( parent.classList.contains( 'expand' ) ){
				parent.classList.add( 'expand-marked' );
			}
			if( parent.tagName.toLowerCase() === 'li' ){
				var toggleInputs = parent.querySelectorAll( 'input.toggle:not(.menu-marked)' );
				if( i.length ){
					toggleInputs[0].classList.add( 'menu-marked' );
					toggleInputs[0].dataset.checked = toggleInputs[0].checked ? 'true' : 'false';
					toggleInputs[0].checked = true;
				}
			}
			parent = parent.parentNode;
		}
	}
    psm && psm.update();
}
window.relearn.markSearch = mark;

function highlight( es, words, options ){
    var settings = {
        className: 'highlight',
        element: 'span',
        caseSensitive: false,
        wordsOnly: false
    };
    Object.assign( settings, options );

    if( !words ){ return; }
    if( words.constructor === String ){
        words = [ words ];
    }
    words = words.filter( function( word, i ){
        return word != '';
    });
    words = words.map( function( word, i ){
        return word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    });
    if( words.length == 0 ){ return this; }

    var flag = settings.caseSensitive ? '' : 'i';
    var pattern = "(" + words.join( '|' ) + ')';
    if( settings.wordsOnly ){
        pattern = '\\b' + pattern + '\\b';
    }
    var re = new RegExp( pattern, flag );

	for( var i = 0; i < es.length; i++ ){
        highlightNode( es[i], re, settings.element, settings.className );
	}
};

function highlightNode( node, re, nodeName, className ){
    if( node.nodeType === 3 && node.parentElement && node.parentElement.namespaceURI == 'http://www.w3.org/1999/xhtml' ) { // text nodes
        var match = node.data.match( re );
        if( match ){
            var highlight = document.createElement( nodeName || 'span' );
            highlight.className = className || 'highlight';
            var wordNode = node.splitText( match.index );
            wordNode.splitText( match[0].length );
            var wordClone = wordNode.cloneNode( true );
            highlight.appendChild( wordClone );
            wordNode.parentNode.replaceChild( highlight, wordNode );
            return 1; //skip added node in parent
        }
    } else if( (node.nodeType === 1 && node.childNodes) && // only element nodes that have children
        !/(script|style)/i.test(node.tagName) && // ignore script and style nodes
        !(node.tagName === nodeName.toUpperCase() && node.className === className) ){ // skip if already highlighted
        for( var i = 0; i < node.childNodes.length; i++ ){
            i += highlightNode( node.childNodes[i], re, nodeName, className );
        }
    }
    return 0;
};

function unmark() {
	sessionStorage.removeItem( baseUriFull + 'search-value' );
	var markedElements = document.querySelectorAll( 'mark' );
	for( var i = 0; i < markedElements.length; i++ ){
		var parent = markedElements[i].parentNode;
		while( parent && parent.classList ){
			if( parent.tagName.toLowerCase() === 'li' ){
				var toggleInputs = parent.querySelectorAll( 'input.toggle.menu-marked' );
				if( i.length ){
					toggleInputs[0].checked = toggleInputs[0].dataset.checked === 'true';
					toggleInputs[0].dataset.checked = null;
					toggleInputs[0].classList.remove( 'menu-marked' );
								}
			}
			if( parent.classList.contains( 'expand-marked' ) ){
				parent.classList.remove( 'expand-marked' );
			}
			parent = parent.parentNode;
		}
	}

	var highlighted = document.querySelectorAll( '.highlightable' );
    unhighlight( highlighted, { element: 'mark' } );
    psm && psm.update();
}

function unhighlight( es, options ){
    var settings = {
        className: 'highlight',
        element: 'span'
    };
    Object.assign( settings, options );

	for( var i = 0; i < es.length; i++ ){
        var highlightedElements = es[i].querySelectorAll( settings.element + '.' + settings.className );
        for( var j = 0; j < highlightedElements.length; j++ ){
            var parent = highlightedElements[j].parentNode;
            parent.replaceChild( highlightedElements[j].firstChild, highlightedElements[j] );
            parent.normalize();
        }
	}
};


// replace jQuery.createPseudo with https://stackoverflow.com/a/66318392
function elementContains( txt, e ){
    var regex = RegExp( txt, 'i' );
    var nodes = [];
    if( e ){
        var tree = document.createTreeWalker( e, 4 /* NodeFilter.SHOW_TEXT */, function( node ){
            return regex.test( node.data );
        });
        var node = null;
        while( node = tree.nextNode() ){
            nodes.push( node.parentElement );
        }
    }
    return nodes;
}

function searchInputHandler( value ){
    unmark();
    if( value.length ){
        sessionStorage.setItem( baseUriFull+'search-value', value );
        mark();
    }
}

function initSearch() {
    // sync input/escape between searchbox and searchdetail
    var inputs = document.querySelectorAll( 'input.search-by' );
    inputs.forEach( function( e ){
        e.addEventListener( 'keydown', function( event ){
            if( event.key == 'Escape' ){
                var input = event.target;
                input.blur();
                searchInputHandler( '' );
                inputs.forEach( function( e ){
                    e.value = '';
                });
                documentFocus();
            }
        });
        e.addEventListener( 'input', function( event ){
            var input = event.target;
            var value = input.value;
            searchInputHandler( value );
            inputs.forEach( function( e ){
                if( e != input ){
                    e.value = value;
                }
            });
        });
    });

    document.querySelectorAll( '[data-search-clear]' ).forEach( function( e ){
        e.addEventListener( 'click', function(){
            inputs.forEach( function( e ){
                e.value = '';
                e.dispatchEvent( new Event( 'input' ) );
            });
            unmark();
        });
    });

    var urlParams = new URLSearchParams( window.location.search );
    var value = urlParams.get( 'search-by' );
    if( value ){
        sessionStorage.setItem( baseUriFull+'search-value', value );
    }
    mark();

    // set initial search value on page load
    if( sessionStorage.getItem( baseUriFull+'search-value' ) ){
        var searchValue = sessionStorage.getItem( baseUriFull+'search-value' );
        inputs.forEach( function( e ){
            e.value = searchValue;
            e.dispatchEvent( new Event( 'input' ) );
        });

        var found = elementContains( searchValue, document.querySelector( '#body-inner' ) );
        var searchedElem = found.length && found[ 0 ];
        if( searchedElem ){
            searchedElem.scrollIntoView( true );
            var scrolledY = window.scrollY;
            if( scrolledY ){
                window.scroll( 0, scrolledY - 125 );
            }
        }
    }

    window.relearn.isSearchInit = true;
    window.relearn.runInitialSearch && window.relearn.runInitialSearch();
}

jQuery(function() {
    initArrowNav();
    initMermaid();
    initSwagger();
    initMenuScrollbar();
    scrollToActiveMenu();
    scrollToFragment();
    initToc();
    initAnchorClipboard();
    initCodeClipboard();
    restoreTabSelections();
    initSwipeHandler();
    initHistory();
    initSearch();
});

function useMermaid( config ){
    if( !Object.assign ){
        // We don't support Mermaid for IE11 anyways, so bail out early
        return;
    }
    if (typeof mermaid != 'undefined' && typeof mermaid.mermaidAPI != 'undefined') {
        mermaid.initialize( Object.assign( { "securityLevel": "antiscript", "startOnLoad": false     }, config ) );
        if( config.theme && variants ){
            var write_style = variants.findLoadedStylesheet( 'variant-style' );
            write_style.setProperty( '--CONFIG-MERMAID-theme', config.theme );
        }
    }
}
if( window.themeUseMermaid ){
    useMermaid( window.themeUseMermaid );
}

function useSwagger( config ){
    if( config.theme && variants ){
        var write_style = variants.findLoadedStylesheet( 'variant-style' );
        write_style.setProperty( '--CONFIG-SWAGGER-theme', config.theme );
    }
}
if( window.themeUseSwagger ){
    useSwagger( window.themeUseSwagger );
}
