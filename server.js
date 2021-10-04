const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const url = require('url');

//오라클 접속
var oracledb = require('oracledb');
var dbConfig = require('./config/dbConfig');
//oracle auto commit
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OBJECT;
var conn;
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

//db 연걸 끊는 함수
function doRelease(conn) {
  conn.release(function (err) {
    console.log('connection ended');
    if (err) {
      console.error('connection ended due to the error', err.message);
    }
    return;
  });
  }////db 연걸 끊는 함수 끝

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
    next();
});



var userRole="";
//로컬호스트3000번으로 가면 uuidV4로 진료방 uid를 만들어서 redirect 해줌
app.get('/', (req, res) => {
  const bookingNo = req.query.bookingNo;
  const roomId = `${uuidV4()}`;
    res.redirect(url.format({
      pathname: `/${roomId}`,
      //이렇게 말고 setAttribute 같이 보내는게 있음 좋을텐데 ㅠㅠ 이럼 보안이....
      query: {
        roomId: roomId,
        bookingNo:bookingNo
      }
    })
);
  //res.redirect(`/${uuidV4()}`)
})


// app.get('/:room', (req, res) => {
//   var roomId = req.query.roomId;
//   var bookingNo = req.query.bookingNo;
//   res.render('room', { 
//       roomId: req.query.roomId,
//       bookingNo: req.query.bookingNo
//     })
// });  


// //진료방으로 들어오면 roomId를 파라미터로 보내줌
app.get('/:room', (req, res) => {
  var roomId = req.query.roomId;
  var bookingNo = req.query.bookingNo;
  userRole=req.cookies.userRole;
  
  //쿠키정보를 가지고와서 role이 의사면 쿼리입력
  if(userRole == "doctor"){
    console.log("의사입장");
    //예약 테이블에 방의 고유 아이디를 업데이트
  var sql = `update booking set room_id='${roomId}' where booking_no=${bookingNo}`;
 
  conn.execute(sql, function(err,result){
           if(err){
               console.log("등록중 에러가 발생했어요!!", err);
               doRelease(conn);
               return;
           }else{
             console.log("result : ", result);
             console.log("_____방아이디 인서트 완료______");
            
           conn.release(function (err) {
             console.log('방 아이디 인서트 후 연결끝');
             if (err) {
               console.error('방연결 끝내지 못했다??', err.message);
               return;
             }
           });
           }
       });


        //고유아이디 업데이트 이후, 예약 번호를 사용해서 환자 정보를 검색해서 진료기록 폼에 넣어줌
        var sql2=`select 
        a.member_no,
        a.NAME,
        a.IDENTIFY_NO,
        a.GENDER,
        b.PAST_HX,
        b.PRE_SELF_AX,
        b.TOPIC,
        b.MED_DELIVERY
        from member a join patients b
        on (a.member_no=b.member_no)
        where a.member_no=(select pt_no from booking where booking_no =${bookingNo})`;     
        var row;
        var ptName;
        var ptIdNo;
        var ptGen;
        var ptMedDelivery;
        conn.execute(sql2, function(err, result){
        if(err){
          console.log("환자간단정보 가져오는 중 에러", err);
          doRelease(conn);
          return;
        }else{
          console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
          console.log("환자 테이블에 환자가 있어야 나옴")
          row = result.rows[0];
        console.log(row);
          ptMNo=row.MEMBER_NO;
          ptName=row.NAME;
          ptIdNo=row.IDENTIFY_NO;
          ptGen=row.GENDER;
          ptMedDelivery=row.MED_DELIVERY;
          //디비연결끊기
          conn.release(function (err) {
            console.log('환자 정보 가져온 후 연결끝');
            if (err) {
              console.error('환자정보는 가져왔는데?? 못했다??', err.message);
              return;
            }
          });
          //페이지 렌더+ 정보 보내기
          res.render('room', { 
            roomId: req.query.roomId,
            bookingNo: req.query.bookingNo,
            ptMNo:ptMNo,
            ptName:ptName,
            ptGen:ptGen,
            ptIdNo:ptIdNo,
            ptMedDelivery:ptMedDelivery
          })


        }

        });

}// end of if role == doctor
  else{
    console.log("환자입장")
    res.render('room', { 
      roomId: req.query.roomId,
      bookingNo: req.query.bookingNo
    })
  }
})//end of 진료방+환자정보 쿼리


//환자정보 조회를 누르면 ajax로 조회

//진료기록 입력을 누르면 ajax로 입력
app.post('/ajax', function (req, res){
  var input = req.body;

  let today = new Date();   
  let year = today.getFullYear(); // 년도
  let month = today.getMonth() + 1;  // 월
  let date = today.getDate();  // 날짜
  let consult_date=year+'/'+month+'/'+date;
  console.log(consult_date);
 
  //https://stackoverflow.com/questions/33475160/node-js-form-sumit-using-ajax 참고
  
  var sql =`insert into consultation(
    CONSULT_DATE,
    PT_ASSESSMENT,
    PT_DIAGNOSIS,
    BOOKING_NO,
    PT_NO,
    DOC_NO
    ) values(
      :CONSULT_DATE,
      :PT_ASSESSMENT,
      :PT_DIAGNOSIS,
      :BOOKING_NO,
      :PT_NO,
      :DOC_NO
    )`;
   conn.execute(
     sql, [consult_date, input.pt_assessment, input.pt_diagnosis, Number(input.booking_no), 2, 3]
    , function(err, rows){
      if (err){
        console.log("Error 진료기록 inserting : %s ",err );
      }
      res.send({'success' : true, 'message' : 'Added Successfully'});
  });
 
});






//환자 정보 조회 버튼 누르면 새 윈도우를 띄워줌
app.get('/searchPt', (req, res) => {
  console.log("search pt page");
  res.writeHead(200, {'contnet-type':'text/html'});
  res.write(ptInformationPage);
  res.end();
  // res.render('searchPt');
})

const ptRouter = require('./routes/ptInfo');
app.use('ptInfo', ptRouter);


io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)

  // // messages
  //   socket.on('message', (message) => {
  //     //send message to the same room
  //     io.to(roomId).emit('createMessage', message)
  // }); 

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})

  server.listen(3000);