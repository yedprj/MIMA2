
module.exports ={
    devserver: {
        port: 3000,
        proxy: {
            '/api':{
                target: 'http://localhost:8000',
                ws:true,
                changeOrigin:true
            }
        }
    }
}