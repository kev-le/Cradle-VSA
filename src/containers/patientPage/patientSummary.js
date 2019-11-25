import React, { Component } from 'react';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Icon } from 'semantic-ui-react'
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';
import SweetAlert from 'sweetalert2-react';

import {
  Button, Header, Modal, Divider, Form, Select, Input, TextArea
} from 'semantic-ui-react'

import { getPrettyDate, getMomentDate } from '../../utils';
import { updatePatient, getPatients } from '../../actions/patients';
import { getReferrals } from '../../actions/referrals';
import { getSelectedPatientStats } from '../../actions/statistics';

import { Bar, Line } from 'react-chartjs-2';
import { ReactComponent as GreenTraffic } from './drawable/green.svg';
import { ReactComponent as YellowTraffic } from './drawable/yellow.svg';
import { ReactComponent as RedTraffic } from './drawable/red.svg';
import ReferralInfo from './referralInfo';
import { getCurrentUser } from '../../actions/users';
import { newReadingPost } from '../../actions/newReading';

const sexOptions = [
  { key: 'm', text: 'Male', value: 'MALE' },
  { key: 'f', text: 'Female', value: 'FEMALE' },
  { key: 'o', text: 'Other', value: 'I' },
]

const pregOptions = [
  { key: 'y', text: 'Yes', value: true },
  { key: 'n', text: 'No', value: false },
]

var symptom = []

function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
class PatientSummary extends Component {

  state = {
    displayPatientModal: false,
    selectedPatient: { readings: [] },
    showVitals: true,
    showTrafficLights: false,
    displayReadingModal: false,
    newReading: {
      userId: "",
      readingId: "",
      dateTimeTaken: "",
      bpSystolic: "",
      bpDiastolic: "",
      heartRateBPM: "",
      dateRecheckVitalsNeeded: "",
      isFlaggedForFollowup: false,
      symptoms: ""
    },
    checkedItems: {
      none: true,
      headache: false,
      bleeding: false,
      blurredVision: false,
      feverish: false,
      abdominalPain: false,
      unwell: false,
      other: false,
      otherSymptoms: ""
    },
    showSuccessReading: false,
    selectedPatientCopy : { readings: [] },
  }

  componentDidMount = () => {
    this.setState({ 'selectedPatient': this.props.selectedPatient })

    console.log("this.props.selectedPatient: ", this.props.selectedPatient);

    this.props.getReferrals(this.getReferralIds(this.props.selectedPatient))

    this.props.getSelectedPatientStats(this.props.selectedPatient.patientId)

  }

  calculateShockIndex = (reading) => {
    const RED_SYSTOLIC = 160
    const RED_DIASTOLIC = 110
    const YELLOW_SYSTOLIC = 140
    const YELLOW_DIASTOLIC = 90
    const SHOCK_HIGH = 1.7
    const SHOCK_MEDIUM = 0.9

    if (reading['bpSystolic'] == undefined || reading['bpDiastolic'] == undefined || reading['heartRateBPM'] == undefined)
      return "NONE"

    const shockIndex = reading['heartRateBPM'] / reading['bpSystolic']

    const isBpVeryHigh = (reading['bpSystolic'] >= RED_SYSTOLIC) || (reading['bpDiastolic'] >= RED_DIASTOLIC)
    const isBpHigh = (reading['bpSystolic'] >= YELLOW_SYSTOLIC) || (reading['bpDiastolic'] >= YELLOW_DIASTOLIC)
    const isSevereShock = (shockIndex >= SHOCK_HIGH)
    const isShock = (shockIndex >= SHOCK_MEDIUM)

    let trafficLight = ""
    if (isSevereShock) {
      trafficLight = "RED_DOWN"
    } else if (isBpVeryHigh) {
      trafficLight = "RED_UP"
    } else if (isShock) {
      trafficLight = "YELLOW_DOWN"
    } else if (isBpHigh) {
      trafficLight = "YELLOW_UP"
    } else {
      trafficLight = "GREEN"
    }
    return trafficLight
  }

  getReferralIds(selectedPatient) {
    console.log("selectedPatient: ", selectedPatient)
    let res = [];
    for (let i in selectedPatient.readings) {
      let reading = selectedPatient.readings[i];
      if (reading.referral != null) {
        res.push(reading.referral)
      }
    }
    console.log("referralIds", res)
    return res
  }

  handleBackBtn = () => {
    // go back to patient table
    this.props.callbackFromParent(false)
  }

  openPatientModal = () => {
    this.setState({ selectedPatientCopy : {...this.state.selectedPatient} } )
    this.setState({ displayPatientModal: true })
  }

  closePatientModal = (e, data) => {
    if (e === "formSubmitted") {
      this.setState({ displayPatientModal: false })
    } else { // form not submitted
      // display original patient fields
      this.setState({ selectedPatient : {...this.state.selectedPatientCopy},
                      displayPatientModal : false } )
    }
    
  }

  openReadingModal = () => {
    this.setState({ displayReadingModal: true })
  }

  closeReadingModal = () => {
    this.setState({ displayReadingModal: false })
  }


  handleSubmit = (event) => {
    event.preventDefault();
    let patientData = JSON.parse(JSON.stringify(this.state.selectedPatient)) // pass by value
    let patientId = patientData.patientId


    // delete any unnecessary fields
    delete patientData.readings
    delete patientData.needsAssessment
    delete patientData.tableData
    delete patientData.patientId

    // let patientJSON = JSON.stringify(patientData);
    this.props.updatePatient(patientId, patientData)
    this.closePatientModal("formSubmitted")
  }

  handleReadingSubmit = event => {
    event.preventDefault()

    if (symptom.indexOf('other') >= 0) {
      symptom.pop('other')
      if (this.state.checkedItems.otherSymptoms != '') {
        symptom.push(this.state.checkedItems.otherSymptoms)
      }
    }

    var dateTime = new Date()
    var readingID = guid()

    this.setState({
      newReading: {
        ...this.state.newReading,
        userId: this.props.user.userId,
        readingId: readingID,
        dateTimeTaken: dateTime.toJSON(),
        symptoms: symptom.toString()
      }
    }, function () {
      let patientData = JSON.parse(JSON.stringify(this.state.selectedPatient))
      let readingData = JSON.parse(JSON.stringify(this.state.newReading))

      // delete any unnecessary fields
      delete patientData.readings
      delete patientData.needsAssessment
      delete patientData.tableData

      let newData = {
        patient: patientData,
        reading: readingData
      }

      console.log(newData)
      this.props.newReadingPost(newData)

      newData['reading']['trafficLightStatus'] = this.calculateShockIndex(newData['reading'])
      this.setState({
        selectedPatient: {
          ...this.state.selectedPatient,
          readings: [...this.state.selectedPatient.readings, newData['reading']]
        },
        showSuccessReading: true
      })
      this.closeReadingModal()
    })
  }

  handleSelectChange = (e, value) => {
    if (value.name === "patientSex" && value.value === "MALE") {
      this.setState({ selectedPatient: { ...this.state.selectedPatient, patientSex : "MALE", gestationalAgeValue : "", isPregnant : false }})
    } else {
      this.setState({ 'selectedPatient': { ...this.state.selectedPatient, [value.name]: value.value } })
    }
  }

  handleReadingChange = (e, value) => {
    this.setState({ 'newReading': { ...this.state.newReading, [value.name]: value.value } })
  }

  handleCheckedChange = (e, value) => {
    // true => false, pop
    if (value.value) {
      if (symptom.indexOf(value.name) >= 0) {
        symptom.pop(value.name)
      }
    } else { // false => true, push
      if (symptom.indexOf(value.name) < 0) {
        symptom.push(value.name)
      }
    }

    if (value.name != 'other') {
      if (symptom.indexOf('none') >= 0) {
        symptom.pop('none')
      }
      this. setState({ 
        checkedItems: { 
          ...this.state.checkedItems, 
          [value.name] : !value.value,
          none: false
        }})
    } else {
      while(symptom.length > 0) {
        symptom.pop();
      }
      this. setState({ 
        checkedItems: {
          none: true,
          headache: false,
          bleeding: false,
          blurredVision: false,
          feverish: false,
          abdominalPain: false,
          unwell: false,
          other: false,
          otherSymptoms: ""
        }
      })
    }
  }

  handleOtherSymptom = event => {
    this.setState({ checkedItems: { ...this.state.checkedItems, [event.target.name]: event.target.value } })
  }

  createReadings = (readingId, dateTimeTaken, bpDiastolic,
    bpSystolic, heartRateBPM, symptoms,
    trafficLightStatus, isReferred, dateReferred,
    drugHistory, medicalHistory) => {
    return {
      readingId, dateTimeTaken, bpDiastolic, bpSystolic, heartRateBPM, symptoms,
      trafficLightStatus, isReferred, dateReferred, drugHistory, medicalHistory
    }
  }

  sortReadings = (readings) => {
    let sortedReadings = readings.sort((a, b) => getMomentDate(b.dateTimeTaken).valueOf() - getMomentDate(a.dateTimeTaken).valueOf())
    return sortedReadings
  }

  getTrafficIcon = (trafficLightStatus) => {
    if (trafficLightStatus === "RED_DOWN") {
      return <div>
        <RedTraffic style={{ "height": "75px", "width": "75px" }} />
        <Icon name="arrow down" size="huge" />
      </div>
    } else if (trafficLightStatus === "RED_UP") {
      return <div>
        <RedTraffic style={{ "height": "75px", "width": "75px" }} />
        <Icon name="arrow up" size="huge" />
      </div>
    } else if (trafficLightStatus === "YELLOW_UP") {
      return <div>
        <YellowTraffic style={{ "height": "75px", "width": "75px" }} />
        <Icon name="arrow up" size="huge" />
      </div>
    } else if (trafficLightStatus === "YELLOW_DOWN") {
      return <div>
        <YellowTraffic style={{ "height": "75px", "width": "75px" }} />
        <Icon name="arrow down" size="huge" />
      </div>
    } else {
      return <GreenTraffic style={{ "height": "75px", "width": "75px" }} />
    }
  }

  average = (monthlyArray) => {
    if (monthlyArray.length !== 0) {
      var total = 0;
      for (var i = 0; i < monthlyArray.length; i++) {
        total += monthlyArray[i];
      }
      return total / monthlyArray.length;
    }
    return 0;
  }

  showVitals = () => {
    this.setState({ showVitals: true, showTrafficLights: false })
  }

  showTrafficLights = () => {
    this.setState({ showVitals: false, showTrafficLights: true })
  }

  createReadingObject = (reading) => {
    const readingId = reading['readingId']
    const dateTimeTaken = reading['dateTimeTaken']
    const bpDiastolic = reading['bpDiastolic']
    const bpSystolic = reading['bpSystolic']
    const heartRateBPM = reading['heartRateBPM']
    const symptoms = reading['symptoms']
    const trafficLightStatus = reading['trafficLightStatus']
    const isReferred = reading['referral'] ? true : false
    const dateReferred = reading['dateReferred']
    const medicalHistory = reading['medicalHistory']
    const drugHistory = reading['drugHistory']
    return this.createReadings(readingId, dateTimeTaken, bpDiastolic,
      bpSystolic, heartRateBPM, symptoms,
      trafficLightStatus, isReferred, dateReferred,
      medicalHistory, drugHistory)
  }

  render() {

    let readings = []

    if (this.state.selectedPatient.readings !== undefined && this.state.selectedPatient.readings.length > 0) {
      for (var i = 0; i < this.state.selectedPatient.readings.length; i++) {
        const reading = this.createReadingObject(this.state.selectedPatient.readings[i])
        readings.push(reading)
      }

      readings = this.sortReadings(readings)
    }

    var bpSystolicReadingsMontly = {}

    if (this.props.selectedPatientStatsList.bpSystolicReadingsMontly) {
      const bpSystolicReadingsData = this.props.selectedPatientStatsList.bpSystolicReadingsMontly
      var averageSystolic = Array(12);
      for (var j = 0; j < 12; j++){
        averageSystolic[j] = this.average(bpSystolicReadingsData[j])
      }

      bpSystolicReadingsMontly = {
        label: 'Systolic',
        fill: false,
        lineTension: 0.1,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
        pointRadius: 1,
        data: averageSystolic
      }
    }

    var bpDiastolicReadingsMonthly = {}
    if (this.props.selectedPatientStatsList.bpDiastolicReadingsMonthly) {
      const bpDiastolicReadingsData = this.props.selectedPatientStatsList.bpDiastolicReadingsMonthly
      var averageDiastolic = Array(12);
      for (var l = 0; l < 12; l++){
        averageDiastolic[l] = this.average(bpDiastolicReadingsData[l])
      }

      bpDiastolicReadingsMonthly = {
        label: 'Diastolic',
        fill: false,
        lineTension: 0.1,
        backgroundColor: 'rgba(148,0,211,0.4)',
        borderColor: 'rgba(148,0,211,1)',
        pointRadius: 1,
        data: averageDiastolic
      }
    }

    var heartRateReadingsMonthly = {}
    if (this.props.selectedPatientStatsList.heartRateReadingsMonthly) {
      const heartRateData = this.props.selectedPatientStatsList.heartRateReadingsMonthly
      var averageHeartRate = Array(12);
      for (var k = 0; k < 12; k++){
        averageHeartRate[k] = this.average(heartRateData[k])
      }

      heartRateReadingsMonthly = {
        label: 'Heart Rate',
        fill: false,
        lineTension: 0.1,
        backgroundColor: 'rgba(255,127,80,0.4)',
        borderColor: 'rgba(255,127,80,1)',
        pointRadius: 1,
        data: averageHeartRate
      }
    }

    const vitalsOverTime = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        bpSystolicReadingsMontly,
        bpDiastolicReadingsMonthly,
        heartRateReadingsMonthly
      ]
    }

    var trafficLight = {}
    if (this.props.selectedPatientStatsList.trafficLightCountsFromDay1) {
      trafficLight = {
        labels: ['GREEN', 'YELLOW UP', 'YELLOW DOWN', 'RED UP', 'RED DOWN'],
        datasets: [{
          backgroundColor: ['green', 'yellow', 'yellow', 'red', 'red'],
          data: Object.values(this.props.selectedPatientStatsList.trafficLightCountsFromDay1)
        }]
      }
    }

    return (
      <div>
        {this.state.selectedPatient ? (
          <div style={{ "margin": "2.5em 0" }}>
            <h1 style={{ "width": "70%", "margin": "-1.35em 0" }}>
              <Icon style={{ "cursor": "pointer", "line-height": "0.7em" }} size="large" name="chevron left" onClick={() => this.handleBackBtn()} />
              Patient Summary : {this.state.selectedPatient.patientName}
            </h1>
            <Button style={{ "float": "right" }}
                    onClick={() => this.openReadingModal()}
                    icon>
              <Icon name='plus' size="large" />
              <Typography variant="body2" component="body2" style={{"lineHeight" : "1.5em", "padding": "10px"}}>
                Add New Reading
              </Typography>
            </Button>
            <div style={{ "clear": "both" }}></div>
            <Divider />
            <Grid container direction="row" spacing={4} >
              <Grid item xs={6} style={{ "minWidth": "500px", "height": "100% !important" }} >
                <Paper style={{ "padding": "35px 25px", "borderRadius": "15px", "height": "100%" }}>
                  <Typography variant="h5" component="h3">
                    <Icon style={{ "line-height": "0.7em" }} name="address card outline" size="large" />
                    Medical Information
                </Typography>
                  <Divider />
                  <div style={{ "padding": "20px 50px" }}>
                    <p><b>Patient ID: </b> {this.state.selectedPatient.patientId} </p>
                    <p><b>Patient Age: </b> {this.state.selectedPatient.patientAge} </p>
                    <p><b>Patient Sex: </b> {this.state.selectedPatient.patientSex} </p>
                    {this.state.selectedPatient.patientSex === "FEMALE" &&
                      <p><b>Pregnant: </b> {this.state.selectedPatient.isPregnant ? "Yes" : "No"} </p>
                    }
                    {this.state.selectedPatient.isPregnant &&
                      <p><b>Gestational Age: </b> {this.state.selectedPatient.gestationalAgeValue} weeks</p>
                    }
                    <ExpansionPanel>
                      <ExpansionPanelSummary
                        expandIcon={<Icon name="chevron down" />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                      >
                        <Typography>Drug History</Typography>
                      </ExpansionPanelSummary>
                      <ExpansionPanelDetails>
                        <Typography>
                          {this.state.selectedPatient.drugHistory}
                        </Typography>
                      </ExpansionPanelDetails>
                    </ExpansionPanel>
                    <ExpansionPanel>
                      <ExpansionPanelSummary
                        expandIcon={<Icon name="chevron down" />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                      >
                        <Typography>Medical History</Typography>
                      </ExpansionPanelSummary>
                      <ExpansionPanelDetails>
                        <Typography>
                          {this.state.selectedPatient.medicalHistory}
                        </Typography>
                      </ExpansionPanelDetails>
                    </ExpansionPanel>
                    <Divider />
                    <Button onClick={() => this.openPatientModal()}>Edit Patient</Button>
                  </div>
                </Paper>
              </Grid>
              <Grid item xs={6} style={{ "minWidth": "500px", "height": "100% !important" }} >
                <Paper style={{ "padding": "35px 25px 0px", "borderRadius": "15px", "height" : "100%" }}>
                  <Typography variant="h5" component="h3">
                    <Icon style={{ "line-height": "0.7em" }} name="heartbeat" size="large" />
                    Vitals Over Time
                </Typography>
                    <Divider />
                    <Button.Group style={{ "width": "100%" }}>
                      <Button active={this.state.showVitals} onClick={() => this.showVitals()}>Show Vitals Over Time</Button>
                      <Button active={this.state.showTrafficLights} onClick={() => this.showTrafficLights()}>Show Traffic Lights</Button>
                    </Button.Group>
                    <br /><br />
                    {this.state.showVitals &&
                      <div>
                        <h4 style={{ "margin": "0" }}>Average Vitals Over Time:</h4>
                        <Line ref="chart" data={vitalsOverTime} />
                      </div>
                    }
                    {this.state.showTrafficLights &&
                      <div>
                        <h4 style={{ "margin": "0" }}>Traffic Lights From All Readings:</h4>
                        <Bar ref="chart" data={trafficLight}
                          options={{ legend: { display: false }, scales: { xAxes: [{ ticks: { fontSize: 10 } }], yAxes: [{ ticks: { beginAtZero: true } }] } }} />
                      </div>
                    }
                  </Paper>
                </Grid>
              </Grid>
              <br />
              <Grid container spacing={0}>
                {readings.map(row => (
                  <Grid key={row.readingId} xs={12}>
                    <Paper style={{ "marginBottom": "35px", "height": "auto", "padding": "45px 50px", "borderRadius": "15px", "display": "flex" }}>
                      <div style={{ "display": "inline-block", "width": "50%" }}>
                        <Typography variant="h4" component="h4">
                          Reading
                        </Typography>

                        <Typography variant="subtitle1" component="subtitle1">
                          Taken on {getPrettyDate(row.dateTimeTaken)}
                        </Typography>

                        <div style={{ "padding": "25px 50px" }}>
                          {this.getTrafficIcon(row.trafficLightStatus)}
                          <br /><br />
                          <p><b>Systolic Blood Pressure: </b> {row.bpSystolic} </p>
                          <p><b>Diastolic Blood Pressure: </b> {row.bpDiastolic} </p>
                          <p><b>Heart Rate (BPM): </b> {row.heartRateBPM} </p>
                          <p><b>Symptoms: </b> {row.symptoms} </p>
                        </div>
                      </div>
                      <div style={{ "borderLeft": "2px solid #84ced4", "display": "inline-block", "width": "50%", "float": "right", "height": "100%" }}>
                        <div style={{ "padding": "0px 50px" }}>
                          <ReferralInfo readingId={row.readingId} referral={this.props.referrals[row.readingId]} />
                        </div>
                      </div>
                    </Paper>
                  </Grid>
                ))}

              </Grid>

              <Modal closeIcon onClose={this.closePatientModal} open={this.state.displayPatientModal}>
                <Modal.Header>Patient Information for ID #{this.state.selectedPatient.patientId}</Modal.Header>
                <Modal.Content scrolling>
                    <Form onSubmit={this.handleSubmit}>
                      <Form.Group widths='equal'>
                        <Form.Field
                          name="patientName"
                          value={this.state.selectedPatient.patientName}
                          control={Input}
                          label='Patient Initials'
                          placeholder='Patient Initials'
                          onChange={this.handleSelectChange}
                          type='text'
                          pattern="[a-zA-Z]*"
                          maxLength='4'
                          minLength='1'
                          required
                        />
                        <Form.Field
                          name="patientAge"
                          value={this.state.selectedPatient.patientAge}
                          control={Input}
                          label='Age'
                          placeholder='Patient Age'
                          onChange={this.handleSelectChange}
                          type='number'
                          min='15'
                          max='60'
                          required
                        />
                        <Form.Field
                          name="patientSex"
                          control={Select}
                          value={this.state.selectedPatient.patientSex}
                          label='Gender'
                          options={sexOptions}
                          placeholder='Gender'
                          onChange={this.handleSelectChange}
                          required
                        />
                      </Form.Group>
                      <Form.Group widths='equal'>
                        <Form.Field
                          name='villageNumber'
                          value={this.state.selectedPatient.villageNumber}
                          control={Input}
                          label='Village Number'
                          placeholder='Village Number'
                          onChange={this.handleSelectChange}
                        />
                        <Form.Field
                          name='isPregnant'
                          value={this.state.selectedPatient.isPregnant}
                          control={Select}
                          label='Pregnant'
                          options={pregOptions}
                          onChange={this.handleSelectChange}
                          disabled={this.state.selectedPatient.patientSex ===  "MALE"}
                        />
                        <Form.Field
                          name='gestationalAgeValue'
                          value={this.state.selectedPatient.gestationalAgeValue}
                          control={Input}
                          label='Gestational Age in Weeks'
                          placeholder='Gestational Age in Weeks'
                          onChange={this.handleSelectChange}
                          type='number'
                          min='1'
                          max='60'
                          required
                          disabled={this.state.selectedPatient.patientSex == 'MALE' || !this.state.selectedPatient.isPregnant}
                        />
                      </Form.Group>
                      <Form.Field
                        name="drugHistory"
                        value={this.state.selectedPatient.drugHistory || ''}
                        control={TextArea}
                        label='Drug History'
                        placeholder="Patient's drug history..."
                        onChange={this.handleSelectChange}
                      />
                      <Form.Field
                        name="medicalHistory"
                        value={this.state.selectedPatient.medicalHistory || ''}
                        control={TextArea}
                        label='Medical History'
                        placeholder="Patient's medical history..."
                        onChange={this.handleSelectChange}
                      />
                      <Form.Field control={Button}>Submit</Form.Field>
                    </Form>

                </Modal.Content>
              </Modal>
              <Modal closeIcon onClose={this.closeReadingModal} open={this.state.displayReadingModal}>
                <Modal.Header>Patient Information</Modal.Header>
                <Modal.Content scrolling>
                  <Modal.Description>
                    <Header>New Patient Reading for ID #{this.state.selectedPatient.patientId}</Header>
                    <Divider />
                    <Form onSubmit={this.handleReadingSubmit}>
                      <Form.Group widths='equal'>
                        <Form.Field
                          name="bpSystolic"
                          value={this.state.selectedPatient.bpSystolic}
                          control={Input}
                          label='Systolic'
                          type='number'
                          min='10'
                          max='300'
                          onChange={this.handleReadingChange}
                          required
                        />
                        <Form.Field
                          name="bpDiastolic"
                          value={this.state.selectedPatient.bpDiastolic}
                          control={Input}
                          label='Diastolic'
                          type='number'
                          min='10'
                          max='300'
                          onChange={this.handleReadingChange}
                          required
                        />
                        <Form.Field
                          name="heartRateBPM"
                          value={this.state.selectedPatient.heartRateBPM}
                          control={Input}
                          label='Heart rate'
                          type='number'
                          min='30'
                          max='300'
                          onChange={this.handleReadingChange}
                          required
                        />
                      </Form.Group>
                      <Form.Checkbox
                        value={this.state.checkedItems.none}
                        name='none'
                        label='None (patient healthy)'
                        onChange={this.handleCheckedChange}
                      />
                      <Form.Group widths='equal'>
                        <Form.Checkbox
                          value={this.state.checkedItems.headache}
                          name='headache'
                          label='Headache'
                          onChange={this.handleCheckedChange}
                        />
                        <Form.Checkbox
                          value={this.state.checkedItems.bleeding}
                          name='bleeding'
                          label='Bleeding'
                          onChange={this.handleCheckedChange}
                        />
                      </Form.Group>
                      <Form.Group widths='equal'>
                        <Form.Checkbox
                          value={this.state.checkedItems.blurredVision}
                          name='blurredVision'
                          label='Blurred vision'
                          onChange={this.handleCheckedChange}
                        />
                        <Form.Checkbox
                          value={this.state.checkedItems.feverish}
                          name='feverish'
                          label='Feverish'
                          onChange={this.handleCheckedChange}
                        />
                      </Form.Group>
                      <Form.Group widths='equal'>
                        <Form.Checkbox
                          value={this.state.checkedItems.abdominalPain}
                          name='abdominalPain'
                          label='Abdominal pain'
                          onChange={this.handleCheckedChange}
                        />
                        <Form.Checkbox
                          value={this.state.checkedItems.unwell}
                          name='unwell'
                          label='Unwell'
                          onChange={this.handleCheckedChange}
                        />
                      </Form.Group>
                      <Form.Group>
                        <Form.Checkbox
                          value={this.state.checkedItems.other}
                          widths='3'
                          name='other'
                          label='Other:'
                          onChange={this.handleCheckedChange}
                        />
                        <Form.TextArea
                          widths='1'
                          name='otherSymptoms'
                          value={this.state.checkedItems.otherSymptoms}
                          onChange={this.handleOtherSymptom}
                          disabled={!this.state.checkedItems.other}
                        />
                      </Form.Group>

                      <Form.Field control={Button}>Submit</Form.Field>
                    </Form>
                  </Modal.Description>
                </Modal.Content>
              </Modal>
              <SweetAlert
                type="success"
                show={this.state.showSuccessReading}
                title="Reading Created!"
                text="Success! You can view the new reading below"
                onConfirm={() => this.setState({ showSuccessReading: false })}
              />
          </div>
            ) : (
            <div>
              <Button onClick={() => this.handleBackBtn()}>Back</Button>
              <h2>No patient selected</h2>
            </div>
            )}
      </div>
    )
  }
}
        
        
const mapStateToProps = ({
  user,
  referrals,
  patientStats
}) => ({
  user : user.currentUser,
  referrals: referrals.mappedReferrals,
  selectedPatientStatsList: patientStats.selectedPatientStatsList
})
      
const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
        updatePatient,
        getPatients,
        getReferrals,
        getSelectedPatientStats,
        getCurrentUser,
        newReadingPost
      },
      dispatch
    )
    
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PatientSummary)
