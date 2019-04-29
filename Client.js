export default class Client
{
	constructor()
	{
		this.debug				= false;
		this.PORT_SERVER_NAME 	= 'PORT_SERVER_NAME';
		this.PORT_CLIENT_NAME 	= 'PORT_CLIENT_NAME';
		this.serverPort			= null;

		this.customFunctions = {};

		chrome.runtime.onConnect.addListener((port)=>
		{
			if( port.name === this.PORT_CLIENT_NAME )
			{
				this.connect();
				port.postMessage({ command : 'PAGE_LOADED', value: JSON.parse( JSON.stringify( window.location ) )});
			}
		});

		this.connect();
	}

	connect()
	{
		let port = chrome.runtime.connect({name: this.PORT_SERVER_NAME });

		port.onMessage.addListener((request)=>
		{
			if( typeof this.customFunctions[ request.request.command ] ===  "function" )
			{
				return this.customFunctions[ request.request.command  ].call(this, request.request.request );
			}
		});

		this.serverPort	= port;

		try
		{
			port.postMessage({ command : 'PAGE_LOADED', value: JSON.parse( JSON.stringify( window.location ) )});
		}
		catch(exception)
		{
			console.error('Error on posting ', exception );
		}
	}

	closeThisTab()
	{
		let url =window.location.href;
		if( this.serverPort === null )
		{
			console.error('Server Port is closed');
			return;
		}

		try
		{
			this.serverPort.postMessage({ command : 'CLOSE_TAB', value:{ url:url } });
		}
		catch(e)
		{
			console.error('Error sending custom request',e);
		}

	}

	executeOnBackground(name, request )
	{
		let url =window.location.href;
		if( this.serverPort === null )
		{
			console.error('Server Port is closed');
			return;
		}
		try
		{
			this.serverPort.postMessage({ command : 'CUSTOM_REQUEST', value:{ url:url ,name:name ,request: request }});
		}
		catch(e)
		{
			console.error('Error sending custom request',e);
		}
	}

	executeOnClients(name, request )
	{
		let url =window.location.href;

		if( this.serverPort === null )
		{
			console.error('Server Port is closed');
			return;
		}

		try
		{
			chrome.windows.getCurrent({},(win)=>{
				this.serverPort.postMessage({ command : 'CUSTOM_REQUEST_TO_CLIENT', value:{ url:url ,name:name ,request: request, window_id: win.id } });
			});
		}
		catch(e)
		{
			console.error('Error sending custom request',e);
		}
	}
	executeOnCurrentTab(name, request )
	{
		let url =window.location.href;

		if( this.serverPort === null )
		{
			console.error('Server Port is closed');
			return;
		}

		try
		{

			chrome.windows.getCurrent({}, (window_info)=>
			{
				chrome.runtime.sendMessage( default_settings.tab_extension_id ,{ open: links, window_id: window_info.id  }, (response)=> { console.log( response);});
			});

		}
		catch(e)
		{
			console.error('Error sending custom request',e);
		}
	}




	log()
	{
		if( this.debug )
		{
			let args = Array.from( arguments );
			console.log.apply( console, args );
		}
	}

	addListener(name,func)
	{
		this.customFunctions[ name ] = func;
	}


	waitTillNotRedy( selector, isArray )
	{
		return new Promise((resolve,reject)=>
		{
			let interval_id = -1;
			if( !this.isReadySelector( selector, isArray ) )
			{
				resolve( true );
				return;
			}

			interval_id = setInterval(()=>
			{
				if( !this.isReadySelector( selector, isArray ) )
				{
					clearInterval( interval_id );
					resolve( true );
				}
			},300 );
		});
	}

	waitTillReady( selector, isArray )
	{
		return new Promise((resolve,reject)=>
		{
			let interval_id = -1;

			if( this.isReadySelector( selector , isArray ) )
			{
				resolve( true );
				return;
			}

			interval_id = setInterval(()=>
			{
				if( this.isReadySelector( selector, isArray ) )
				{
					clearInterval( interval_id );
					resolve( true );
					return;
				}
			},300);
		});
	}

	isReadySelector( selector, isArray )
	{
		let obj = isArray ? document.querySelectorAll( selector ) : document.querySelector( selector );

		return isArray ? obj !== null && obj.length > 0 : obj !== null;
	}

	isReadyElementSelector(element, selector, isArray )
	{
		let obj = isArray ? element.querySelectorAll( selector ) : element.querySelector( selector );

		return isArray ? obj !== null && obj.length > 0 : obj !== null;
	}

	waitTillElementReady(element, selector, isArray  )
	{
		return new Promise((resolve,reject)=>
		{
			let interval_id = -1;

			if( this.isReadyElementSelector( element ,selector ,isArray ) )
			{
				resolve( true );
				return;
			}

			interval_id = setInterval(()=>
			{
				if( this.isReadyElementSelector( element ,selector ,isArray ) )
				{
					resolve( true );
					clearInterval( interval_id );
					return;
				}
			},300);
		});
	}

	getElementWithText(selector, text, ignoreCase )
	{
		let doms = document.querySelectorAll( selector );
		let darray = Array.from( doms );

		return darray.find((entry)=>
		{
			let domtxt = entry.textContent.replace(/\s+/g,' ').trim();
			if( ignoreCase )
			{
				return domtxt.toLowerCase() === text.toLowerCase();
			}
			return domtxt === text;
		});
	}

	waitTillTextReady( selector, text, ignoreCase )
	{
		let ignore = ignoreCase === undefined ? true : ignoreCase;

		return new Promise((resolve,reject)=>
		{
			let check = ()=>{
				let ele = this.getElementWithText( selector, text, ignoreCase );
				return ele === undefined ? false : true;
			};

			let interval_id = 0;

			interval_id = setInterval(()=>
			{
				if( check() )
				{
					clearInterval( interval_id );
					resolve( true );
				}
			},400);
		});
	}
}
