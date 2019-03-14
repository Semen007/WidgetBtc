'use strict';

class BtcWidget {

	constructor (selector)
	{
		this.context = document.querySelector(selector);

		this.btc_ticker = new BtcTicker('https://blockchain.info/ticker', '$');

		if ( ! this.context) {
			throw new Error('Не удалось найти элемент с селектором '+selector);
		}

		this.load();
	}

	load()
	{
		let url_html_widget = 'b_btc_widget.html?v='+(new Date()).getTime()

		let promise = fetch(url_html_widget)
			.then((response) =>
			{
				if ( ! response.ok) {
					throw new Error('Не удалось получить html шаблон по url '+url_html_widget);
				}

				return response.text();
			})
			.then((html) =>
			{
				this.context.innerHTML = html;
			})
			.then(() =>
			{
				this.initInput();

				this.initCurrencies();
			});
	}

	initInput() {
		let input_btc = this.context.querySelector('input[name=btc]')

		input_btc.addEventListener(
			'focus',
			() => {
				input_btc.select();
			}
		);

		window.addEventListener(
			EventBtcTickerUpdate,
			() => {
				if (this.btc_ticker.last_update)
				{
					let datetime = this.btc_ticker.last_update;

					this.context.querySelector('.datetime .value').innerHTML =
						datetime.toLocaleDateString() + ' ' + datetime.toLocaleTimeString();
				}
			}
		);

		window.dispatchEvent(new Event(EventBtcTickerUpdate));
	}

	initCurrencies()
	{
		this.btc_ticker.getData().then((data) =>
		{
			let country = Object.keys(data);

			country.forEach((country) =>
			{
				let rate   = data[country]['last'];
				let symbol = data[country]['symbol'];

				let currencies = this.context.querySelector('.currencies');

				let currency = currencies.querySelector('template').content.cloneNode(true);

				currency.querySelector('.logo .icon').classList.add(country);

				currency.querySelector('.logo span').innerHTML = country;

				currencies.appendChild(currency);

				currency = currencies.lastElementChild;

				let input_btc = this.context.querySelector('input[name=btc]');

				let updateCurrency = (() =>
				{
					let count_btc = input_btc.value;

					count_btc = ( ! count_btc ? 0 : count_btc );

					let sum = (count_btc * rate).toFixed(2);

					let language = navigator.language || 'ru-RU';

					sum = symbol+' '+new Intl.NumberFormat(language).format(sum);

					currency.querySelector('.sum').innerHTML = sum;
					currency.querySelector('.sum').setAttribute('title', sum);
				});

				input_btc.addEventListener('input', updateCurrency);

				window.addEventListener(EventBtcTickerChange, updateCurrency);

				input_btc.dispatchEvent(new Event('input'));
			});
		});
	}
}

const EventBtcTickerUpdate = 'BtcTickerUpdate';
const EventBtcTickerChange = 'BtcTickerChange';

class BtcTicker
{
	constructor(url, symbol = null)
	{

		this.url = url;
		this.symbol = symbol;

		this.data = null;
		this.last_update = null;

		this.loadData();

		this.initAutoLoad();
	}


	initAutoLoad()
	{
		setInterval(
			() => {
				this.loadData();
			},
			2 * 1000
		);
	}


	getLastUpdate()
	{
		return this.last_update;
	}


	/**
	 * @return {Promise}
	 */
	getData()
	{
		let promise = new Promise((resolve, reject) =>
		{
			if (this.data) {
				resolve();

			} else {
				window.addEventListener(
					EventBtcTickerUpdate,
					() => {
						resolve();
					}
				);
			}
		});

		return promise.then(() =>
		{
			return this.data;
		});
	}


	loadData()
	{
		fetch(this.url)
			.then(
				(response) => {
					return response.json();
				},
				() => {
					if (this.data === null) {
						throw new Error('Не удалось получить json от btc ticker');
					}
				}
			)
			.then((json) =>
			{
				if (this.symbol)
				{
					Object.keys(json).map((key) =>
					{
						if (json[key]['symbol'] !== this.symbol) {
							delete json[key];
						}
					});
				}

				let change_data = ( JSON.stringify(this.data) === JSON.stringify(json) ? false : true );

				this.last_update = new Date();

				if (change_data)
				{
					this.data = json;

					window.dispatchEvent(new Event(EventBtcTickerChange));
				}

				window.dispatchEvent(new Event(EventBtcTickerUpdate));
			});
	}
}