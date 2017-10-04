var crypto = require("crypto");
var bodyParser = require("body-parser");
var request = require('request');
var express = require("express");

var key = '99d077e1b43a4a4ebfeb83654ba7b69e';

//https://bittrex.com/api/v1.1/account/getorderhistory
var app = express();
app.use(bodyParser.json());
var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
  app.get("/api/posicoes", function(reqApp, resApp) {
    request({
        uri: 'https://bittrex.com/api/v1.1/public/getmarketsummaries',
        method: 'GET'
      }, function (err, res, b) {
        var mercados = JSON.parse(b);
        mercados = mercados.result;

    var d = new Date();
    var path="https://bittrex.com/api/v1.1/account/getorderhistory?apikey=d147eb1efc3347dfa3385970c5154681&nonce="+d.getTime();
    request({
        headers: {
          'apisign': assinar(path,key),
        },
        uri: path,
        method: 'GET'
      }, function (err, res, body) {
        //it works!
        var posicoes = [];
        var data = JSON.parse(body);
          for (var i = data.result.length-1; i >=0; i--) {
              var posicao = undefined;
              for (var j = 0; j < posicoes.length; j++) {
                if(posicoes[j].paridade==data.result[i]["Exchange"] && posicoes[j].quantidade!=0.0){
                    posicao = posicoes[j];
                }
              }
              if(posicao==undefined){
                posicao={};
                posicao.custos=0;
                // console.log('Cadastrando posicao de '+data.result[i]["Exchange"])
                posicao.paridade=data.result[i]["Exchange"];
                if(data.result[i]["OrderType"]=='LIMIT_SELL'){
                  posicao.quantidade=-data.result[i]["Quantity"];
                  posicao.valorVenda=data.result[i]["Price"];
                  posicao.valorCompra=0;
                }else{
                  posicao.quantidade=data.result[i]["Quantity"];
                  posicao.valorCompra=data.result[i]["Price"];
                  posicao.valorVenda=0;
                }
                posicoes.push(posicao);
              }else{
                // console.log('Atualizando posicao de '+data.result[i]["Exchange"])
                if(data.result[i]["OrderType"]=='LIMIT_SELL'){
                  if(data.result[i]["QuantityRemaining"]>0){
                    posicao.quantidade=posicao.quantidade-(data.result[i]["Quantity"]-data.result[i]["QuantityRemaining"]);
                  }else{
                    posicao.quantidade=posicao.quantidade-data.result[i]["Quantity"];
                  }

                  posicao.valorVenda+=data.result[i]["Price"];
                }else{
                  posicao.quantidade=posicao.quantidade+data.result[i]["Quantity"];
                  posicao.valorCompra+=data.result[i]["Price"];
                }
              }
              posicao.custos+=data.result[i]["Commission"];
            }
            for (var j = 0; j < posicoes.length; j++) {
              if(posicoes[j].quantidade==0.0){
                posicoes[j].resultado=posicoes[j].valorVenda-posicoes[j].valorCompra-posicoes[j].custos;
                posicoes[j].resultadoPercentual=posicoes[j].resultado/posicoes[j].valorCompra;
                posicoes[j].status='FECHADA'
              }else{
                posicoes[j].status='ABERTA';
                // console.log(mercados.result);

                for (var x = 0; x < mercados.length; x++) {
                  if(mercados[x]['MarketName']==posicoes[j].paridade){
                    var valorVendaAtual = posicoes[j].quantidade*mercados[x]['Last'];
                    posicoes[j].resultado=valorVendaAtual-posicoes[j].valorCompra-posicoes[j].custos;
                    posicoes[j].resultadoPercentual=posicoes[j].resultado/posicoes[j].valorCompra;
                  }
                }
              }
            }
          resApp.json(posicoes);
          console.log(res);
      });
      });
});


function assinar(str,key){
  var hmac = crypto.createHmac("sha512", key);
    var signed = hmac.update(new Buffer(str, 'utf-8')).digest("hex");
    return signed
}
