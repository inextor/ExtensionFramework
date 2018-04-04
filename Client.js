class ExtensionFrameworkClient
{
	constructor()
	{
		this.debug				= false;
		this.PORT_SERVER_NAME 	= 'PORT_SERVER_NAME';
		this.PORT_CLIENT_NAME 	= 'PORT_CLIENT_NAME';
		this.severPort			= null;

		this.customFunctions = {};

		console.log('Init');

		chrome.runtime.onConnect.addListener((port)=>
		{
			console.log('COnnect please'+port.name );
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
		//Testing if the lamda works instead of the function
		console.log('Connection maybe???');

		var port = chrome.runtime.connect({name: this.PORT_SERVER_NAME });

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
			console.log('Posting the message');
			port.postMessage({ command : 'PAGE_LOADED', value: JSON.parse( JSON.stringify( window.location ) )});
		}
		catch(exception)
		{
			console.error('Error on posting ', exception );
		}
	}

	closeThisTab()
	{
		var url =window.location.href;
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

	executeOnBackgrond(name, request )
	{
		var url =window.location.href;
		if( this.serverPort === null )
		{
			console.error('Server Port is closed');
			return;
		}
		try
		{
			this.serverPort.postMessage({ command : 'CUSTOM_REQUEST', value:{ url:url ,name:name ,request: request} });
		}
		catch(e)
		{
			console.error('Error sending custom request',e);
		}
	}

	executeOnClients(name, request )
	{
		var url =window.location.href;

		if( this.serverPort === null )
		{
			console.error('Server Port is closed');
			return;
		}

		try
		{
			this.serverPort.postMessage({ command : 'CUSTOM_REQUEST_TO_CLIENT', value:{ url:url ,name:name ,request: request} });
			return Promise.resolve( 'hEllyeah' );
		}
		catch(e)
		{
			console.error('Error sending custom request',e);
			return Promise.reject( e );
		}
	}

	addListener(name,func)
	{
		this.customFunctions[ name ] = func;
	}
}
