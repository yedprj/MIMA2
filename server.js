const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const url = require('url');

var oracledb = require('oracledb');
var dbConfig = require('./config/dbConfig');
//oracle auto commit
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OBJECT;
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended:true}));

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

function doRelease(conn) {
  conn.release(function (err) {
    console.log('connection ended');
    if (err) {
      console.error(err.message);
    }
  });
  }


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


app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(function(req, res, next) {
 res.header("Access-Control-Allow-Origin", "http://127.0.0.1:8020");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
    next();
});

//로컬호스트3000번으로 가면 uuidV4로 진료방 uid를 만들어서 redirect 해줌
app.get('/', (req, res) => {
 
  const bookingNo = req.query.bookingNo;
 const roomId = `${uuidV4()}`;
  res.redirect(url.format({
    pathname: `/${roomId}`,
    //이렇게 말고 setAttribute 같이 보내는게 있음 좋을텐데 ㅠㅠ 이럼 패스가 너무길어져서...
    query: {
      roomId: roomId,
      bookingNo:bookingNo
    }
  })
);
  
  //res.redirect(`/${uuidV4()}`)
})


// //진료방으로 들어오면 roomId를 파라미터로 보내줌
// app.get('/:room', (req, res) => {
//   var roomId = req.query.roomId;
//   var bookingNo = req.query.bookingNo;

//   //예약 테이블에 방의 고유 아이디를 업데이트
//   var sql = `update booking set room_id='${roomId}' where booking_no=${bookingNo}`;
 
//    conn.execute(sql, function(err,result){
//             if(err){
//                 console.log("등록중 에러가 발생했어요!!", err);
//                 doRelease(conn);
//                 return;
//             }else{
              
//               console.log("result : ", result);
//               console.log("_____방아이디 인서트 완료______");
//               doRelease(conn);
//             }
//         });

//   //고유아이디 업데이트 이후, 예약 번호를 사용해서 환자 정보를 검색해서 진료기록 폼에 넣어줌
//    var sql2=`select 
//    a.member_no,
//    a.NAME,
//    a.IDENTIFY_NO,
//    a.GENDER,
//    b.PAST_HX,
//    b.PRE_SELF_AX,
//    b.TOPIC,
//    b.MED_DELIVERY
// from member a join patients b
// on (a.member_no=b.member_no)
// where a.member_no=(select pt_no from booking where booking_no =${bookingNo})`;     
// var row;
// var ptName;
// var ptIdNo;
// var ptGen;
// var ptMedDelivery;
// conn.execute(sql2, function(err, result){
//   if(err){
//       console.log("값을 가져오는 중 에러가 발생했어요!!", err);
//     doRelease(conn);
//     return;
//   }else{
//     console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
//     console.log("환자 테이블에 환자가 있어야 나옴")
//     row = result.rows[0];
//    console.log(row);
//     ptMNo=row.MEMBER_NO;
//     ptName=row.NAME;
//     ptIdNo=row.IDENTIFY_NO;
//     ptGen=row.GENDER;
//     ptMedDelivery=row.MED_DELIVERY;
   
//     //페이지 렌더+ 정보 보내기
//     res.render('room', { 
//       roomId: req.query.roomId,
//       bookingNo: req.query.bookingNo,
//       ptMNo:ptMNo,
//       ptName:ptName,
//       ptGen:ptGen,
//       ptIdNo:ptIdNo,
//       ptMedDelivery:ptMedDelivery
//     })
//    doRelease(conn);
//   }

// });  
// })

app.get('/:room', (req, res) => {
  var roomId = req.query.roomId;
  var bookingNo = req.query.bookingNo;
  res.render('room', { 
      roomId: req.query.roomId,
      bookingNo: req.query.bookingNo
    })

});  



//환자 정보 조회 버튼 누르면 새 윈도우를 띄워줌
app.get('/searchPt', (req, res) => {
 
  res.render('views/searchPt');
})



io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)

  // messages
    socket.on('message', (message) => {
      //send message to the same room
      io.to(roomId).emit('createMessage', message)
  }); 

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

  server.listen(3000);