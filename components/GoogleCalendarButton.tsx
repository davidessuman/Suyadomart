import React from 'react';
import { TouchableOpacity, Text, Linking, StyleSheet } from 'react-native';

interface GoogleCalendarButtonProps {
	event: {
		title: string;
		description?: string;
		location?: string;
		start?: Date;
		end?: Date;
	};
}

const formatDate = (date: Date) => {
	return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const GoogleCalendarButton: React.FC<GoogleCalendarButtonProps> = ({ event }) => {
	if (!event || !event.start || !event.end) return null;

	const handlePress = () => {
		const start = formatDate(event.start!);
		const end = formatDate(event.end!);
		const url =
			`https://calendar.google.com/calendar/render?action=TEMPLATE` +
			`&text=${encodeURIComponent(event.title)}` +
			(event.description ? `&details=${encodeURIComponent(event.description)}` : '') +
			(event.location ? `&location=${encodeURIComponent(event.location)}` : '') +
			`&dates=${start}/${end}`;
		Linking.openURL(url);
	};

	return (
		<TouchableOpacity style={styles.button} onPress={handlePress}>
			<Text style={styles.text}>Add to Google Calendar</Text>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	button: {
		backgroundColor: '#4285F4',
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderRadius: 6,
		alignItems: 'center',
		marginVertical: 8,
	},
	text: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
