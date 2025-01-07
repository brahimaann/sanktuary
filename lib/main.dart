import 'package:flutter/material.dart';

void main() {
  runApp(const SanktuaryApp());
}

class SanktuaryApp extends StatelessWidget {
  const SanktuaryApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sanktuary',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sanktuary Home'),
      ),
      body: const Center(
        child: Text('Welcome to Sanktuary!'),
      ),
    );
  }
}
