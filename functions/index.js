const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const xlsx = require('xlsx');
const fs = require('fs');
const os = require('os');
const path = require('path');

admin.initializeApp();

// Função para processar arquivos enviados
exports.processUploadedFile = functions.firestore
    .document('fileUploads/{fileId}')
    .onCreate(async (snap, context) => {
        const fileData = snap.data();
        const fileId = context.params.fileId;
        
        // Verificar se o arquivo está pendente de processamento
        if (fileData.status !== 'pending') {
            console.log(`Arquivo ${fileId} já foi processado ou não está pendente.`);
            return null;
        }
        
        try {
            console.log(`Iniciando processamento do arquivo ${fileId} do tipo ${fileData.fileType}`);
            
            // Baixar o arquivo do Storage
            const fileUrl = fileData.fileUrl;
            const fileName = fileData.fileName;
            const tempFilePath = path.join(os.tmpdir(), fileName);
            
            // Fazer download do arquivo
            const response = await fetch(fileUrl);
            const buffer = await response.buffer();
            fs.writeFileSync(tempFilePath, buffer);
            
            // Processar o arquivo com base no tipo
            if (fileData.fileType === 'indicadores') {
                await processIndicadoresFile(tempFilePath);
            } else if (fileData.fileType === 'produtos') {
                await processProdutosFile(tempFilePath);
            } else {
                throw new Error(`Tipo de arquivo desconhecido: ${fileData.fileType}`);
            }
            
            // Atualizar status do upload
            await admin.firestore().collection('fileUploads').doc(fileId).update({
                status: 'processed',
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Limpar arquivo temporário
            fs.unlinkSync(tempFilePath);
            
            console.log(`Arquivo ${fileId} processado com sucesso.`);
            return null;
        } catch (error) {
            console.error(`Erro ao processar arquivo ${fileId}:`, error);
            
            // Atualizar status para erro
            await admin.firestore().collection('fileUploads').doc(fileId).update({
                status: 'error',
                errorMessage: error.message,
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return null;
        }
    });

// Processar arquivo de indicadores
async function processIndicadoresFile(filePath) {
    // Ler o arquivo Excel/CSV
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    if (!data || data.length === 0) {
        throw new Error('Arquivo vazio ou sem dados válidos');
    }
    
    console.log(`Processando ${data.length} registros de indicadores`);
    
    // Extrair dados necessários
    const indicadoresData = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        totalVendas: 0,
        itensVendidos: 0,
        microcreditoConcedido: 0,
        operacoesMicrocredito: 0,
        saldoDevedor: 0,
        percentualDevedor: 0,
        valorVendido: 0,
        taxaConversao: 0,
        faturamentoPorOng: {},
        inadimplenciaPorOng: {},
        topMaras: [],
        alertas: []
    };
    
    // Agrupar dados por ONG
    const ongData = {};
    
    // Processar cada linha do arquivo
    data.forEach(row => {
        // Verificar se é uma linha válida com os campos necessários
        if (row['Nome Mara'] && row['Nome ONG'] && row['(R$) Valor Vendas Total Mês'] !== undefined) {
            // Dados da Mara
            const mara = {
                nome: row['Nome Mara'],
                ong: row['Nome ONG'],
                valorVendas: parseFloat(row['(R$) Valor Vendas Total Mês']) || 0,
                itensVendidos: parseInt(row['(#) Itens Vendas Total Mês']) || 0,
                valorMicroCredito: parseFloat(row['(R$) Valor Recebido Micro Credito']) || 0,
                qtdMicroCredito: parseInt(row['(#) QTD Recebida Micro Credito']) || 0,
                valorVendidoMicroCredito: parseFloat(row['(R$) Valor Vendido Micro Credito']) || 0,
                qtdVendidaMicroCredito: parseInt(row['(#) QTD Vendida Micro Credito']) || 0,
                saldoDevedorMicroCredito: parseFloat(row['(R$) Saldo Devedor Micro Credito']) || 0,
                qtdSaldoDevedorMicroCredito: parseInt(row['(#) Saldo Devedor Micro Credito']) || 0
            };
            
            // Adicionar ao total
            indicadoresData.totalVendas += mara.valorVendas;
            indicadoresData.itensVendidos += mara.itensVendidos;
            indicadoresData.microcreditoConcedido += mara.valorMicroCredito;
            indicadoresData.operacoesMicrocredito += mara.qtdMicroCredito;
            indicadoresData.saldoDevedor += mara.saldoDevedorMicroCredito;
            indicadoresData.valorVendido += mara.valorVendidoMicroCredito;
            
            // Agrupar por ONG
            if (!ongData[mara.ong]) {
                ongData[mara.ong] = {
                    totalVendas: 0,
                    itensVendidos: 0,
                    microcreditoConcedido: 0,
                    operacoesMicrocredito: 0,
                    saldoDevedor: 0,
                    valorVendido: 0,
                    maras: []
                };
            }
            
            ongData[mara.ong].totalVendas += mara.valorVendas;
            ongData[mara.ong].itensVendidos += mara.itensVendidos;
            ongData[mara.ong].microcreditoConcedido += mara.valorMicroCredito;
            ongData[mara.ong].operacoesMicrocredito += mara.qtdMicroCredito;
            ongData[mara.ong].saldoDevedor += mara.saldoDevedorMicroCredito;
            ongData[mara.ong].valorVendido += mara.valorVendidoMicroCredito;
            ongData[mara.ong].maras.push(mara);
        }
    });
    
    // Calcular percentuais e métricas
    if (indicadoresData.microcreditoConcedido > 0) {
        indicadoresData.percentualDevedor = parseFloat(((indicadoresData.saldoDevedor / indicadoresData.microcreditoConcedido) * 100).toFixed(1));
        indicadoresData.taxaConversao = parseFloat(((indicadoresData.valorVendido / indicadoresData.microcreditoConcedido) * 100).toFixed(1));
    }
    
    // Preencher faturamentoPorOng
    for (const [ongName, ongStats] of Object.entries(ongData)) {
        indicadoresData.faturamentoPorOng[ongName] = ongStats.totalVendas;
        
        // Calcular taxa de inadimplência
        if (ongStats.microcreditoConcedido > 0) {
            indicadoresData.inadimplenciaPorOng[ongName] = parseFloat(((ongStats.saldoDevedor / ongStats.microcreditoConcedido) * 100).toFixed(1));
        } else {
            indicadoresData.inadimplenciaPorOng[ongName] = 0;
        }
    }
    
    // Criar top Maras
    const allMaras = [];
    for (const [ongName, ongStats] of Object.entries(ongData)) {
        allMaras.push(...ongStats.maras.map(mara => ({
            nome: mara.nome,
            ong: mara.ong,
            valorVendas: mara.valorVendas,
            itensVendidos: mara.itensVendidos
        })));
    }
    
    // Ordenar por valor de vendas
    allMaras.sort((a, b) => b.valorVendas - a.valorVendas);
    indicadoresData.topMaras = allMaras.slice(0, 5); // Top 5 Maras
    
    // Criar alertas
    // Alerta de inadimplência alta
    const ongAltoInadimplencia = Object.entries(indicadoresData.inadimplenciaPorOng)
        .filter(([_, taxa]) => taxa > 30)
        .map(([ongName, _]) => ongName);
    
    if (ongAltoInadimplencia.length > 0) {
        indicadoresData.alertas.push({
            tipo: 'danger',
            titulo: 'Alta taxa de inadimplência',
            mensagem: `${ongAltoInadimplencia.length} ONGs possuem taxa de inadimplência acima de 30% do microcrédito concedido.`
        });
    }
    
    // Alerta de Maras sem atividade
    const marasSemAtividade = data.filter(row => parseFloat(row['(R$) Valor Vendas Total Mês'] || 0) === 0).length;
    const marasSemAtividadeComCredito = data.filter(row => 
        parseFloat(row['(R$) Valor Vendas Total Mês'] || 0) === 0 && 
        parseFloat(row['(R$) Valor Recebido Micro Credito'] || 0) > 0
    ).length;
    
    if (marasSemAtividade > 0) {
        indicadoresData.alertas.push({
            tipo: 'warning',
            titulo: 'Maras sem atividade',
            mensagem: `${marasSemAtividade} Maras não registraram vendas no mês atual, sendo ${marasSemAtividadeComCredito} com microcrédito ativo.`
        });
    }
    
    // Alerta de destaque de performance
    const topOng = Object.entries(indicadoresData.faturamentoPorOng)
        .sort((a, b) => b[1] - a[1])
        .shift();
    
    if (topOng) {
        indicadoresData.alertas.push({
            tipo: 'success',
            titulo: 'Destaque de performance',
            mensagem: `${topOng[0]} teve o maior volume de vendas no mês: R$ ${topOng[1].toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
        });
    }
    
    // Alerta de baixo volume de vendas
    const ongBaixaConversao = Object.entries(ongData)
        .filter(([_, stats]) => stats.microcreditoConcedido > 0 && (stats.valorVendido / stats.microcreditoConcedido * 100) < 15)
        .sort((a, b) => (a[1].valorVendido / a[1].microcreditoConcedido) - (b[1].valorVendido / b[1].microcreditoConcedido))
        .shift();
    
    if (ongBaixaConversao) {
        const taxaConversao = parseFloat((ongBaixaConversao[1].valorVendido / ongBaixaConversao[1].microcreditoConcedido * 100).toFixed(1));
        indicadoresData.alertas.push({
            tipo: 'warning',
            titulo: 'Baixo volume de vendas',
            mensagem: `${ongBaixaConversao[0]} apresenta conversão de apenas ${taxaConversao}% do microcrédito em vendas.`
        });
    }
    
    // Salvar no Firestore
    console.log('Salvando indicadores processados no Firestore');
    await admin.firestore().collection('indicadores').add(indicadoresData);
    
    return indicadoresData;
}

// Processar arquivo de produtos
async function processProdutosFile(filePath) {
    // Ler o arquivo Excel/CSV
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    if (!data || data.length === 0) {
        throw new Error('Arquivo vazio ou sem dados válidos');
    }
    
    console.log(`Processando ${data.length} registros de produtos`);
    
    // Extrair dados necessários
    const produtosData = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        totalVendas: 0,
        totalItens: 0,
        microcreditoConcedido: 0,
        microcreditoVendido: 0,
        taxaConversao: 0,
        margemMedia: 0,
        produtosDestaque: {
            maiorFaturamento: null,
            maisVendido: null,
            melhorMargem: null
        },
        produtosComPotencial: [],
        statusMicrocredito: {
            concedido: 0,
            vendido: 0
        },
        vendasPorCanal: {
            ligas: 0,
            semLigas: 0
        },
        oportunidadesNegocio: {
            demandaNaoAtendida: 0,
            percentualNaoConvertido: 0,
            potencialExpansao: 0
        }
    };
    
    // Processando cada produto
    const produtos = [];
    let totalCusto = 0;
    let totalVenda = 0;
    
    data.forEach(row => {
        // Verificar se é uma linha válida com os campos necessários
        if (row['Nome do Produto'] && row['(R$) Preço Custo'] !== undefined && row['(R$) Preço Venda'] !== undefined) {
            // Dados do produto
            const produto = {
                nome: row['Nome do Produto'],
                precoCusto: parseFloat(row['(R$) Preço Custo']) || 0,
                precoVenda: parseFloat(row['(R$) Preço Venda']) || 0,
                itensMicroCredito: parseFloat(row['(R$) Itens em Micro Credito']) || 0,
                qtdItensMicroCredito: parseInt(row['(#) Itens em Micro Credito']) || 0,
                itensVendidosMicroCredito: parseFloat(row['(R$) Itens Vendidos Micro Credito']) || 0,
                qtdVendidaMicroCredito: parseInt(row['(#) Itens Vendidos Micro Credito']) || 0,
                vendasLigas: parseFloat(row['(R$) Vendas Ligas']) || 0,
                qtdVendasLigas: parseInt(row['(#) Vendas Ligas']) || 0,
                vendasSemLigas: parseFloat(row['(R$) Vendas sem Ligas']) || 0,
                qtdVendasSemLigas: parseInt(row['(#) Vendas sem Ligas']) || 0,
                vendasTotal: parseFloat(row['(R$) Vendas Total']) || 0,
                qtdVendasTotal: parseInt(row['(#) Vendas Total']) || 0
            };
            
            // Calcular margem
            produto.margem = produto.precoCusto > 0 ? 
                ((produto.precoVenda - produto.precoCusto) / produto.precoVenda * 100) : 0;
            
            // Adicionar aos totais
            produtosData.totalVendas += produto.vendasTotal;
            produtosData.totalItens += produto.qtdVendasTotal;
            produtosData.microcreditoConcedido += produto.itensMicroCredito;
            produtosData.microcreditoVendido += produto.itensVendidosMicroCredito;
            produtosData.vendasPorCanal.ligas += produto.vendasLigas;
            produtosData.vendasPorCanal.semLigas += produto.vendasSemLigas;
            
            // Acumular para cálculo da margem média
            if (produto.qtdVendasTotal > 0) {
                totalCusto += (produto.precoCusto * produto.qtdVendasTotal);
                totalVenda += produto.vendasTotal;
            }
            
            // Adicionar à lista de produtos
            produtos.push(produto);
        }
    });
    
    // Calcular taxa de conversão de microcrédito
    if (produtosData.microcreditoConcedido > 0) {
        produtosData.taxaConversao = parseFloat(((produtosData.microcreditoVendido / produtosData.microcreditoConcedido) * 100).toFixed(1));
    }
    
    // Calcular margem média
    if (totalVenda > 0) {
        produtosData.margemMedia = parseFloat((((totalVenda - totalCusto) / totalVenda) * 100).toFixed(1));
    }
    
    // Encontrar produtos destaque
    if (produtos.length > 0) {
        // Maior faturamento
        const maiorFaturamento = produtos.reduce((prev, current) => 
            (prev.vendasTotal > current.vendasTotal) ? prev : current);
        
        produtosData.produtosDestaque.maiorFaturamento = {
            nome: maiorFaturamento.nome,
            valor: maiorFaturamento.vendasTotal,
            quantidade: maiorFaturamento.qtdVendasTotal
        };
        
        // Mais vendido (quantidade)
        const maisVendido = produtos.reduce((prev, current) => 
            (prev.qtdVendasTotal > current.qtdVendasTotal) ? prev : current);
        
        produtosData.produtosDestaque.maisVendido = {
            nome: maisVendido.nome,
            valor: maisVendido.vendasTotal,
            quantidade: maisVendido.qtdVendasTotal
        };
        
        // Melhor margem (entre produtos vendidos)
        const produtosVendidos = produtos.filter(p => p.qtdVendasTotal > 0);
        if (produtosVendidos.length > 0) {
            const melhorMargem = produtosVendidos.reduce((prev, current) => 
                (prev.margem > current.margem) ? prev : current);
            
            produtosData.produtosDestaque.melhorMargem = {
                nome: melhorMargem.nome,
                margem: parseFloat(melhorMargem.margem.toFixed(1)),
                custoProduto: melhorMargem.precoCusto,
                precoVenda: melhorMargem.precoVenda
            };
        }
    }
    
    // Identificar produtos com potencial de crescimento
    produtosData.produtosComPotencial = produtos
        .filter(p => 
            p.margem > 50 && // Alta margem
            (p.qtdVendasTotal > 0 || p.qtdItensMicroCredito > 0) // Com vendas ou em microcrédito
        )
        .map(p => ({
            nome: p.nome,
            margem: parseFloat(p.margem.toFixed(1)),
            demanda: p.qtdVendasTotal > 10 ? 'Alta' : 
                    p.qtdVendasTotal > 5 ? 'Média' : 'Baixa',
            statusMicrocredito: p.qtdItensMicroCredito > 0 ? 
                `${parseFloat((p.qtdVendidaMicroCredito / p.qtdItensMicroCredito * 100).toFixed(1))}% utilizado` : 'N/A',
            potencial: p.margem > 80 && (p.qtdVendasTotal > 5 || p.qtdItensMicroCredito > 5) ? 'Alto' : 
                      p.margem > 50 && (p.qtdVendasTotal > 3 || p.qtdItensMicroCredito > 3) ? 'Médio' : 'Baixo'
        }))
        .sort((a, b) => {
            // Ordenar por potencial (Alto > Médio > Baixo) e depois por margem
            if (a.potencial === b.potencial) {
                return b.margem - a.margem;
            }
            return a.potencial === 'Alto' ? -1 : 
                  b.potencial === 'Alto' ? 1 :
                  a.potencial === 'Médio' ? -1 : 1;
        })
        .slice(0, 5); // Top 5 produtos com potencial
    
    // Preencher status de microcrédito
    produtosData.statusMicrocredito = {
        concedido: produtosData.microcreditoConcedido,
        vendido: produtosData.microcreditoVendido
    };
    
    // Preencher oportunidades de negócio
    produtosData.oportunidadesNegocio = {
        demandaNaoAtendida: produtosData.microcreditoConcedido - produtosData.microcreditoVendido,
        percentualNaoConvertido: parseFloat(((1 - (produtosData.microcreditoVendido / produtosData.microcreditoConcedido)) * 100).toFixed(1)),
        potencialExpansao: produtos.filter(p => p.margem > 60 && (p.qtdVendasTotal > 0 || p.demanda === 'Alta')).length
    };
    
    // Salvar no Firestore
    console.log('Salvando dados de produtos processados no Firestore');
    await admin.firestore().collection('produtos').add(produtosData);
    
    return produtosData;
}
