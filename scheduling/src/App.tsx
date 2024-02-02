import { useEffect, useState } from 'react'
import './Calendar.css'
import './App.css'
import { useStyletron } from 'baseui'

/**
 * The CalendarTime interface is used to represent a time in the calendar.
 * @param hour The hour of the day (0-23)
 * @param minute The minute of the hour (0-59)
 */
interface CalendarTime {
  hour: number,
  minute: number,
}

interface CalendarEvent {
  startTime: CalendarTime,
  endTime: CalendarTime,
  title: string,
  body: React.ReactNode,
  onClick: () => void,
  onHover: () => void,
  onLeave: () => void,
  color: string,
}

interface CalendarProps {
  events: CalendarEvent[],
}

const CalendarGrid = () => {
  /*
  Calendar grid will be a 5x13 grid that will be used to display the events.
  */

  const hours = [
    '8 am',
    '9 am',
    '10 am',
    '11 am',
    '12 pm',
    '1 pm',
    '2 pm',
    '3 pm',
    '4 pm',
    '5 pm',
    '6 pm',
    '7 pm',
    '8 pm',
  ]

  return (
    <table className="calendar-grid">
      <tr className='header-row'>
        <td className='time-td' id="calendar-time-header"></td>
        <td  id="calendar-monday-header">Monday</td>
        <td>Tuesday</td>
        <td>Wednesday</td>
        <td>Thursday</td>
        <td>Friday</td>
      </tr>
      {hours.map((hour) => {
        return (
          <tr>
            <td className='time-td'>{hour}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        )
      })}
    </table>
  )
}

const EventPositioner = (props: {event: CalendarEvent, children: React.ReactNode}) => {
  // This div will be used to position the event on the grid
  // we use the start and end times to calculate the position of the event
  // firstly, the column will be the day of the week
  // the row will be the start time
  // the height will be the end time - start time

  const [css, $theme] = useStyletron()
  
  // we need the dom to be ready to calculate the position of the event
  // wait for the dom to be ready
  const [domReady, setDomReady] = useState(false)
  useEffect(() => {
    setDomReady(true)
  }
  , [])

  if (!domReady) {
    return null
  }

  const startHour = props.event.startTime.hour
  const startMinute = props.event.startTime.minute
  const endHour = props.event.endTime.hour
  const endMinute = props.event.endTime.minute

  const timeHeaderCell = document.getElementById('calendar-time-header');
  // we will use this to calculate contextual size
  // the height of this cell is the same as the height of every hour
  // the width of this cell will be used as an offset as the first column represents the time (and not a day)
  const mondayHeaderCell = document.getElementById('calendar-monday-header');
  // we will use this to calculate contextual size
  // the width of this cell is the same as the width of every day
  // the height of this cell will be the same as the height of every hour
  const cellHeight = timeHeaderCell?.clientHeight + 1; // we add 1 to account for the border
  const dayWidth = mondayHeaderCell?.clientWidth + 1; // we add 1 to account for the border

  let leftPos = timeHeaderCell?.clientWidth + 2; // start by offsetting
  let topPos = startHour * cellHeight! + (startMinute / 60) * cellHeight!;
  let width = dayWidth;
  leftPos = leftPos! + (width! * 1); // now we move to the correct day

  let height = (endHour - startHour) * cellHeight! + ((endMinute - startMinute) / 60) * cellHeight!;
  let backgroundColor = props.event.color;

  return (
    <div className={css({
      position: 'absolute',
      top: `${topPos}px`, // we need to add px to the string
      left: `${leftPos}px`,
      height: `${height}px`, // we need to add px to the string
      width: `${width}px`, // we need to add px to the string
      backgroundColor: "rgba(255, 0, 0, 0.5)",
      borderRadius: '12px',
      // dashed inside border
      border: '2px dashed black',
      zIndex: 1,
      overflow: 'hidden',
      padding: 0,
      margin: 0,
    })}>
      <p>{props.event.title}</p>
    </div>
  );
}
  
const EventDisplay = (props: {event: CalendarEvent}) => {
  const [css, $theme] = useStyletron()
  return (
      <div>
        <h3>{props.event.title}</h3>
        <p>{props.event.body}</p>
      </div>
  );
}

const CalendarEventsOverlay = (props: {events: CalendarEvent[]}) => {

  const [css, $theme] = useStyletron()

  return (
    <div className={
      css({
        position: 'absolute',
        top: 0,
        left: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, )',
      })
    }>
      {props.events.map((event) => {
        return (
          <EventPositioner event={event}>
            <EventDisplay event={event} />
          </EventPositioner>
        );
      }
      )}
    </div>
  );
}
/**
 * The Calendar component is a simple 5 day calendar that can display events.
 * It works by first creating a grid of 5 columns and 13 rows (8 am to 8 pm) and then it will overlay events on top of the grid.
 * @param props 
 * @returns 
 */
const Calendar = (props: CalendarProps) => {
  
  // we want a div that will contain the grid and have the event overlay displayed directly on top of it
  const [css, $theme] = useStyletron()

  return (
    <div className={css({display: 'flex', flexDirection: 'column', position: "relative"})}>
      <CalendarGrid />
      <CalendarEventsOverlay events={props.events} />
    </div>
  )
}

function App() {

  const testEvents: CalendarEvent[] = [
    {
      startTime: {hour: 13, minute: 0},
      endTime: {hour: 14, minute: 0},
      title: "Test Event",
      body: "This is a test event",
      onClick: () => {},
      onHover: () => {},
      onLeave: () => {},
      color: 'red',
    },
    {
      startTime: {hour: 9, minute: 0},
      endTime: {hour: 10, minute: 0},
      title: "Test Event",
      body: "This is a test event",
      onClick: () => {},
      onHover: () => {},
      onLeave: () => {},
      color: 'blue',
    },
  ]

  return (
    <>
      <Calendar events={testEvents} />
    </>
  )
}

export default App
