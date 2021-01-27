const bcrypt = require("bcryptjs");

const Event = require("../../models/event");
const User = require("../../models/user");
const Booking = require("../../models/booking");

const hardCodedUserId = "60116d80a722fa3420be932b";

const getEvents = async (eventIds) => {
  try {
    const events = await Event.find({ _id: { $in: eventIds } });

    return events.map((event) => ({
      ...event._doc,
      _id: event.id,
      date: new Date(event._doc.date).toISOString(),
      creator: getUser(event.creator),
    }));
  } catch (err) {
    throw err;
  }
};

const getEvent = async (id) => {
  try {
    const event = await Event.findById(id);

    return { ...event._doc, _id: event.id, creator: getUser(event.creator) };
  } catch (err) {
    throw err;
  }
};

const getUser = async (userId) => {
  try {
    const user = await User.findById(userId);

    return {
      ...user._doc,
      _id: user.id,
      createdEvents: getEvents(user._doc.createdEvents),
    };
  } catch (err) {
    throw err;
  }
};

module.exports = {
  events: async () => {
    try {
      const events = await Event.find();

      return events.map((event) => ({
        ...event._doc,
        date: new Date(event._doc.date).toISOString(),
        creator: getUser(event._doc.creator),
      }));
    } catch (err) {
      throw err;
    }
  },
  bookings: async () => {
    try {
      const bookings = await Booking.find();

      return bookings.map((booking) => ({
        ...booking._doc,
        _id: booking.id,
        user: getUser(booking._doc.user),
        event: getEvent(booking._doc.event),
        createdAt: new Date(booking._doc.createdAt).toISOString(),
        updatedAt: new Date(booking._doc.updatedAt).toISOString(),
      }));
    } catch (err) {
      throw err;
    }
  },
  createEvent: async (args) => {
    try {
      const result = await new Event({
        title: args.eventInput.title,
        description: args.eventInput.description,
        price: +args.eventInput.price,
        date: new Date().toISOString(),
        creator: hardCodedUserId,
      }).save();

      const user = await User.findById(hardCodedUserId);

      if (!user) {
        throw new Error("User not found");
      }

      const createdEvent = {
        ...result._doc,
        _id: result._doc._id.toString(),
        date: new Date(result._doc.date).toISOString(),
        creator: getUser(result._doc.creator),
      };

      user.createdEvents.push(createdEvent);

      await user.save();

      return createdEvent;
    } catch (err) {
      throw err;
    }
  },
  createUser: async (args) => {
    try {
      const user = await User.findOne({ email: args.userInput.email });

      if (user) {
        throw new Error("User already exist");
      }

      const hashedPassword = await bcrypt.hash(args.userInput.password, 12);

      const result = await new User({
        email: args.userInput.email,
        password: hashedPassword,
      }).save();

      return { ...result._doc, password: null, id: result.id };
    } catch (err) {
      throw err;
    }
  },
  bookEvent: async (args) => {
    try {
      const event = await Event.findOne({ _id: args.eventId });
      const booking = new Booking({
        user: hardCodedUserId,
        event,
      });

      const result = await booking.save();

      return {
        ...result._doc,
        _id: result.id,
        user: getUser(result._doc.user),
        event: getEvent(result._doc.event),
        createdAt: new Date(result._doc.createdAt).toISOString(),
        updatedAt: new Date(result._doc.updatedAt).toISOString(),
      };
    } catch (err) {
      throw err;
    }
  },
  cancelBooking: async (args) => {
    try {
      const booking = await Booking.findById(args.bookingId).populate("event");
      await Booking.deleteOne({ _id: args.bookingId });

      return {
        ...booking.event._doc,
        _id: booking.event.id,
        creator: getUser(booking.event.creator),
      };
    } catch (err) {
      throw err;
    }
  },
};
