var currentCurrency = {};
var apiUrl = 'https://proyecteapi.herokuapp.com';

function createCryptoCurrencyDataCall() {
    return {
        searchTerm: currentCurrency.shortName
    }
}

function cryptoCurrencyCall() {
    var currencyApiUrl = `${apiUrl}/crypto`;
    var data = createCryptoCurrencyDataCall();
    ajaxCall(currencyApiUrl, data).then(cryptoCurrencyResponse);
}

function cryptoCurrencyResponse(historic) {

    createPricesChart(historic);

    const prices = historic.map(elem => {
        return (Math.trunc(elem.rate));
    });

    var currentPrice = parseFloat(historic[historic.length - 1].rate);
    var yesterdayPrice = parseFloat(historic[historic.length - 2].rate);

    var changePercentage = ((currentPrice - yesterdayPrice) / yesterdayPrice).toFixed(3);

    $("#todayPrice").text(currentPrice.toFixed(2));
    $("#percentagePrice").text(changePercentage + '%');

    changePercentage > 0 ?
        $("#percentagePrice").attr('style', 'color:green') :
        $("#percentagePrice").attr('style', 'color:red');

    const bollingerSignal = getBollingerSignal(historic, prices);
    const movingAveragesSignal = getMovingAveragesSignal(historic, prices);
    const rsiSignal = getRisSignal(historic, prices);

    displaySignals('bb', bollingerSignal);
    displaySignals('ma', movingAveragesSignal);
    displaySignals('rsi', rsiSignal);
}

function displaySignals(shortIndicator, signal) {
    var indicator = $(`#${shortIndicator}Signal`);
    indicator.text(signal);
    $(`#${shortIndicator}Img`).attr('src', `./IMAGES/${signal.toLowerCase()}.png`);

    switch (signal.toLowerCase()) {
        case 'sell':
            indicator.addClass("sellSignal");
            break;
        case 'buy':
            indicator.addClass("buySignal");
            break;
        case 'hold':
            indicator.addClass("holdSignal");
            break;
    }
}

function getBollingerSignal(historic, prices) {
    const bollingerData = getBollingerData(historic, prices).reverse();
    var bollingerSignal = "";
    if (bollingerData[0].price < bollingerData[0].upperBand && bollingerData[1].price > bollingerData[1].upperBand) {
        bollingerSignal = "SELL";
    } else if (bollingerData[0].price > bollingerData[0].lowerBand && bollingerData[1].price < bollingerData[1].lowerBand) {
        bollingerSignal = "BUY";
    } else {
        bollingerSignal = "HOLD";
    }

    return bollingerSignal;
}

function getMovingAveragesSignal(historic, prices) {
    const maData = getMaData(historic, prices).reverse();
    var movingAveragesSignal = "";
    if (maData[0].avg20 < maData[0].avg50 && maData[1].avg20 > maData[1].avg50) {
        movingAveragesSignal = "SELL";
    } else if (maData[0].avg20 > maData[0].avg50 && maData[1].avg20 < maData[1].avg50) {
        movingAveragesSignal = "BUY";
    } else {
        movingAveragesSignal = "HOLD";
    }

    return movingAveragesSignal;
}

function getRisSignal(historic, prices) {
    const rsiData = getRisData(historic, prices).reverse();
    var rsiSignal = "";
    if (rsiData[0] > 70) {
        rsiSignal = "SELL";
    } else if (rsiData[0] < 40) {
        rsiSignal = "BUY";
    } else {
        rsiSignal = "HOLD";
    }
    return rsiSignal;
}


function createPricesChart(historic) {
    var startDate = moment(new Date(moment(new Date()).subtract(365, 'days').calendar())).format('YYYY-MM-DD');
    var endDate = moment(new Date()).format('YYYY-MM-DD');

    $("#stock-chart").kendoStockChart({
        dataSource: {
            data: historic
        },
        title: {
            text: currentCurrency.name.toUpperCase()
        },
        dateField: "timestamp",
        series: [{
            type: "line",
            field: "rate"
        }],
        categoryAxis: {
            labels: {
                rotation: "auto"
            }
        },
        navigator: {
            series: {
                type: "area",
                field: "rate"
            },
            select: {
                from: startDate,
                to: endDate
            },
            categoryAxis: {
                labels: {
                    rotation: "auto"
                }
            }
        }
    });
}

function getBollingerData(historic, prices) {
    const takenDays = 21;
    const bollingerArray = prices.map((element, i) => {
        if (i - takenDays >= 0) {
            const avg = getAverage(prices.slice(i - takenDays, i));
            const stdv = getStdv(prices.slice(i - takenDays, i));
            const upperBand = avg + (2 * stdv);
            const lowerBand = avg - (2 * stdv);
            return {
                timestamp: historic[i].timestamp,
                price: element,
                upperBand,
                lowerBand
            }
        } else {
            return {
                timestamp: historic[i].timestamp,
                price: element,
                upperBand: null,
                lowerBand: null
            };
        }
    });
    return bollingerArray;
}

function getMaData(historic, prices) {
    const movingAveragesArray = prices.map((element, i) => {
        if (i - 50 >= 0) {
            const avg20 = getAverage(prices.slice(i - 20, i));
            const avg50 = getAverage(prices.slice(i - 50, i));
            return {
                timestamp: historic[i].timestamp,
                price: element,
                avg20,
                avg50
            }
        } else {
            return {
                timestamp: historic[i].timestamp,
                price: element,
                avg20: null,
                avg50: null
            };
        }
    });
    return movingAveragesArray;
}

function getRisData(historic, prices) {
    const takenDays = 21;
    var returnArray = prices.map((elem, i) => {
        if (i === 0) {
            return null;
        } else {
            return (prices[i] / prices[i + 1]) - 1
        }
    });
    var positiveArray = returnArray.map(elem => {
        return elem > 0 ? 1 : 0;
    });
    var rsiArray = positiveArray.map((elem, i) => {
        if (i - takenDays >= 0) {
            return {
                timestamp: historic[i].timestamp,
                price: historic[i].rate,
                rsi: (getAverage(positiveArray.slice(i - takenDays, i))) * 100
            }
        } else {
            return null;
        }
    });
    return rsiArray;
}

function cryptoChangeActions() {
    displaySections();
    cryptoCurrencyCall();
    twitterCall();
    newsCall();

    $.when(twitterCall(), newsCall()).done(function (twitterResponse, newsResponse) {
        twitterCallback(twitterResponse[0]);
        newsCallBack(newsResponse[0]);
        cryptoInfoDisplay();
        startCarrousel();
    });
}

function startCarrousel(){
    $('.owl-carousel').owlCarousel({
        loop: true,
        margin: 10,
        nav: true,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 1
            },
            1000: {
                items: 1
            }
        }
    });
}

function newsCall() {
    var currentDate = moment(new Date()).format('L');
    var url = 'https://newsapi.org/v2/everything';
    var data = {
        q: currentCurrency.name,
        from: currentDate,
        to: currentDate,
        sortBy: 'popularity',
        pageSize: 10,
        apiKey: '590ee702b8964b46a1b9a8e181518171'
    }
    return ajaxCall(url, data);
}

function twitterCall() {
    const twitterUrl = `${apiUrl}/tweets`;
    const data = {
        searchTerm: currentCurrency.name
    }
    return ajaxCall(twitterUrl, data);
}


function cryptoInfoDisplay(){
    var containerRow = $('#cryptoInfoContainer');
    console.log(currentCurrency.shortName);
    containerRow.empty();
    if (currentCurrency.shortName==='BTC'){
        containerRow.addClass("container");
        var infoContentContainer = $('<div class="col-12">');
        var infoText = $('<p class="text-justify">').text('Bitcoin is a digital currency that was created in 2009 by an unknown person or group of people using the alias Satoshi Nakamoto (Click here to go to Satoshi Nakamoto original white paper). Bitcoin works on a decentralized system meaning that transactions are made with no middle men- meaning no banks! Bitcoin can be used to book hotels on Expedia, shop for furniture on Overstock and buy Xbox games. But much of the hype is about getting rich by trading it, and it’s why we are here to help.');
        
        var moreInfoContainer = $('<div class="row text-center">');
        var moreInfoColumn = $('<div class="col-md-12 col-sm-12 col-12">');
        var moreInfo = $("<p>").text('Go to the following links to get more information');
        moreInfoColumn.append(moreInfo);
        moreInfoContainer.append(moreInfoColumn);

        var linksContainer = $('<div class="row text-center">');
        var link1Column = $('<div class="col-md-4 col-sm-6 col-12">');
        var link1 = $('<a>').text('Satoshi Nakamoto White paper').attr("href","https://bitcoin.org/bitcoin.pdf");
        link1.attr("target", "_blank");
        link1Column.append(link1);
        var link2Column = $('<div class="col-md-4 col-sm-6 col-12">');
        var link2 = $('<a>').text('Getting started with bitcoin').attr("href","https://bitcoin.org/en/getting-started");
        link2.attr("target", "_blank");
        link2Column.append(link2);
        var link3Column = $('<div class="col-md-4 col-sm-6 col-12">');
        var link3 = $('<a>').text('What is bitcoin?').attr("href","https://www.coindesk.com/information/what-is-bitcoin/");
        link3.attr("target", "_blank");
        link3Column.append(link3);
        linksContainer.append(link1Column,link2Column,link3Column); 
        infoContentContainer.append(infoText, moreInfoContainer, linksContainer);
        containerRow.append(infoContentContainer);
    } else {
        containerRow.addClass("container");
        console.log("Im here");
        var infoContentContainer = $('<div class="col-12">');
        var infoText = $('<p class="text-justify">').text('Ethereum is a decentralized system, which means it is not controlled by any single governing entity. An absolute majority of online services, businesses and enterprises are built on a centralized system of governance. This approach has been used for hundreds of years, and while history proved time and time again that it’s flawed, its implementation is still necessary when the parties don’t trust each other.Ethereum took the technology behind Bitcoin and substantially expanded its capabilities. It is a whole network, with its own Internet browser, coding language and payment system. Most importantly, it enables users to create decentralized applications on Ethereum’s Blockchain.');
        var moreInfoContainer = $('<div class="row text-center">');
        var moreInfoColumn = $('<div class="col-md-12 col-sm-12 col-12">');
        var moreInfo = $("<p>").text('Go to the following links to get more information');
        moreInfoColumn.append(moreInfo);
        moreInfoContainer.append(moreInfoColumn);

        var linksContainer = $('<div class="row text-center">');
        var link1Column = $('<div class="col-md-4 col-sm-6 col-12">');
        var link1 = $('<a>').text('Learn More').attr("href","https://www.ethereum.org");
        link1.attr("target", "_blank");
        link1Column.append(link1);
        var link2Column = $('<div class="col-md-4 col-sm-6 col-12">');
        var link2 = $('<a>').text('Etherum for Begginers').attr("href","https://blockgeeks.com/guides/ethereum/");
        link2.attr("target", "_blank");
        link2Column.append(link2);
        linksContainer.append(link1Column,link2Column); 
        infoContentContainer.append(infoText, moreInfoContainer, linksContainer);
        containerRow.append(infoContentContainer);
    }
}

function newsCallBack(news){
    news.articles.forEach(article => {
        var finalDate = moment(new Date(article.publishedAt)).format('L');
        var newsComponent = $('<div>').addClass('col-12 col-sm-6 col-md-4 col-lg-4 newsComponent');
        var newsHeaderRow = $('<div class="row mb-2">');
        var newsHeaderColumn1 = $('<div class="p-0 col-2">');
        var newsHeaderColumn2 = $('<div class="text-left p-0 col-10">');
        newsHeaderRow.append(newsHeaderColumn1);
        newsHeaderRow.append(newsHeaderColumn2);
        var title = $('<span>').text(article.title);
        var publishedText = $('<p class="m-0">').text('Published Date');
        var publishedAt = $('<p class="m-0">').text(finalDate);
        var newsImage = $('<img>').attr('src', article.urlToImage).addClass("newsImage");
        var newsLink = $('<a>').attr('href', article.url);
        newsLink.attr('target', '_blank');
        newsLink.append(newsImage);
        newsHeaderColumn1.append(newsLink);
        newsHeaderColumn2.append(publishedText, publishedAt);
        var columnContainer = $('<div class="columnContainer text-left">');
        columnContainer.append(newsHeaderRow, title)
        newsComponent.append(columnContainer);
        $('#newsContainer').append(newsComponent);
    });
}

function twitterCallback(response) {
    const tweets = response.statuses;

    tweets.forEach(tweet => {
        var tweetFinalText = urlify(tweet.text);
        var tweetComponent = $('<div>').addClass('col-12 col-sm-6 col-md-4 tweetComponent');
        var userImg = $('<img>').attr('src', tweet.user.profile_image_url_https);
        userImg.addClass('tweetImage');
        var userLink = $('<a>').attr('href', `https://twitter.com/@${tweet.user.screen_name}`);
        userLink.attr('target', '_blank');
        var twitterName = $('<span>').text(`@${tweet.user.screen_name}`);
        userLink.append(twitterName);
        var tweetHeaderRow = $('<div class="row">')
        var tweetHeaderCol1 = $('<div class="col-2 p-0">');
        var tweetHeaderCol2 = $('<div class="col-10 p-0 text-left tweetHeaderName">')
        tweetHeaderRow.append(tweetHeaderCol1, tweetHeaderCol2);;
        tweetHeaderCol1.append(userImg);
        tweetHeaderCol2.append(userLink);
        var tweetTextContainer = $('<div class="text-left">').addClass('tweetText');
        var tweetText = $('<p>').html(tweetFinalText);
        tweetTextContainer.append(tweetText);
        var columnContainer = $('<div class="columnContainer">');
        columnContainer.append(tweetHeaderRow, tweetTextContainer);
        tweetComponent.append(columnContainer);

        $('#tweetsContainer').append(tweetComponent);
    });
}

function ajaxCall(url, data) {
    return $.ajax({
        url,
        method: 'GET',
        data
    })
}

function getStdv(array) {
    return math.std(array);
}

function getAverage(array) {
    return math.mean(array)
}

function urlify(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function (url) {
        return '<a href="' + url + '">' + url + '</a>';
    })
}


function displaySections() {
    $('#learnButton').show();
    $('#analysis').show();
    $('#indicators').show();
    $('#info').show();
    $('#tweetsContainer').empty();
    $('#newsContainer').empty();
}

//Handlers
function onBitcoinHandler() {
    currentCurrency = {
        name: 'bitcoin',
        shortName: 'BTC'
    }
    cryptoChangeActions();
}

function onEtherumHandler() {
    currentCurrency = {
        name: 'ethereum',
        shortName: 'ETH'
    }
    cryptoChangeActions();
}

//Bindings
$(".dropdown-item[data-value='BTC']").on('click', onBitcoinHandler);
$(".dropdown-item[data-value='ETH']").on('click', onEtherumHandler);


$(window).on("resize", function () {
    kendo.resize($(".k-chart"));
});

