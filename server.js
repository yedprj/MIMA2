const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')

var oracledb = require('oracledb');
var dbConfig = require('./config/dbConfig');
//oracle auto commit
oracledb.autoCommit = true;


var conn;
//오라클 접속
oracledb.getConnection({
    user: dbConfig.user,
    password: dbConfig.password,
    connectString: dbConfig.connectString
},function(err,connection){
    if(err){
        console.log("접속이 실패했습니다.",err);
    }
    console.log('connected');
    conn = connection;

});

//클라이언트로부터 insert 요청받으면
app.post("/insert",function(request, response){
    console.log(request.body);
    //오라클에 접속해서 insert문을 실행한다. 
  var roomId = request.body.rmId;
  console.log(roomId);
    var bookingNo = 1;
        //쿼리문 실행 
        conn.execute(`insert into consultation(room_id) values(${roomId}) where booking_no=${bookingNo}`,function(err,result){
            if(err){
                console.log("등록중 에러가 발생했어요!!", err);
                response.writeHead(500, {"ContentType":"text/html"});
                response.end("fail!!");
            }else{
              console.log("result : ", result);
                response.writeHead(200, {"ContentType":"text/html"});
                response.end("success!!");
            }
        });
    });

// oracledb.getConnection(
//   {
//     user: dbConfig.user,
//     password: dbConfig.password,
//     connectString: dbConfig.connectString
//   }, function (err, conn) {
//     if (err) {
//       console.error(err.message);
//       return;
//     }
//     console.log('connected');
//     conn.execute('select member_id from member', function (err, result) {
//       if (err) {
//         console.error(err.message);
//         doRelease(conn);
//         return;
//       }
//       console.log(result.metadata);
//       console.log(result.rows);
//       doRelease(conn);
//     });
//   });

// function doRelease(conn) {
//   conn.release(function (err) {
//     console.log('connection ended');
//     if (err) {
//       console.error(err.message);
//     }
//   });
//   }


// oracledb.getConnection({
//   user: "mental",
//   password: "mental",
//   connectString: "localhost",
//   database: 'xe'
// }, function (err, conn) {
//   if (err) {
//     console.error(err.message);
//     return;
//   }
//   console.log('connected');

// conn.execute("select * from member", {}, { outFormat: oracledb.OBJECT }, function (err, result) {
//   if (err) throw err;

//   console.log('query read success');

//   dataStr = JSON.stringify(result);
//   console.log(dataStr);

//   arrStr = JSON.stringify(result.rows);
//   var arr = JSON.parse(arrStr);
//   console.log(arr);

//   console.log(arr[29].MEMBER_ID+" "+arr[29].PASSWORD);
// })

// });





app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.json())

//로컬호스트3000번으로 가면 uuidV4로 진료방 uid를 만들어서 redirect 해줌
app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

//진료방으로 들어오면 roomId를 파라미터로 보내줌
app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})



io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

  server.listen(3000);