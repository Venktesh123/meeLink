const Meeting = require("../models/Meeting");
const googleMeetService = require("../services/googleMeetService");

// Get all meetings
const getAllMeetings = async (req, res) => {
  try {
    // Allow filtering by courseId if provided
    const filter = {};
    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    const meetings = await Meeting.find(filter).sort({ date: 1, start: 1 });
    res.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
};

// Get a single meeting by ID
const getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json(meeting);
  } catch (error) {
    console.error("Error fetching meeting:", error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
};

// Create a new meeting
const createMeeting = async (req, res) => {
  try {
    const {
      subject,
      description,
      startTime,
      endTime,
      instructor,
      roomNumber,
      color,
      courseId,
      attendees = [],
    } = req.body;

    // Validate required fields
    if (!subject || !startTime || !endTime || !courseId) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["subject", "startTime", "endTime", "courseId"],
      });
    }

    // Create Google Meet
    const googleMeetData = await googleMeetService.createGoogleMeet(
      subject,
      description,
      startTime,
      endTime,
      attendees
    );

    // Prepare meeting data
    const meetingData = {
      subject,
      link: googleMeetData.hangoutLink,
      instructor,
      description,
      date: new Date(startTime).setHours(0, 0, 0, 0), // Set to start of day
      start: new Date(startTime),
      end: new Date(endTime),
      roomNumber:
        roomNumber || `Virtual Room ${Math.floor(Math.random() * 1000)}`,
      color: color || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      courseId,
      attendees,
      participants: attendees.length,
    };

    // Create meeting in database
    const meeting = await Meeting.create(meetingData);
    res.status(201).json(meeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update a meeting
const updateMeeting = async (req, res) => {
  try {
    const {
      subject,
      description,
      instructor,
      roomNumber,
      color,
      // Note: We don't allow updating link, date, start, end times, or courseId
      // as these would require recreating the Google Meet
    } = req.body;

    // Find the meeting
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Update fields
    if (subject) meeting.subject = subject;
    if (description) meeting.description = description;
    if (instructor) meeting.instructor = instructor;
    if (roomNumber) meeting.roomNumber = roomNumber;
    if (color) meeting.color = color;

    // Save updated meeting
    await meeting.save();
    res.json(meeting);
  } catch (error) {
    console.error("Error updating meeting:", error);
    res.status(500).json({ error: "Failed to update meeting" });
  }
};

// Delete a meeting
const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // Delete from database
    await meeting.remove();

    // Note: This doesn't delete the Google Calendar event
    // You'd need to implement that with calendar.events.delete if required

    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
};

module.exports = {
  getAllMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
};
