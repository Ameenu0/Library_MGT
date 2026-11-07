## Current status

The project is now working with the approved admin and student workflows in place:

- admin-only routes are separated from librarian screens
- admin inventory allows adding books
- admin dashboard supports student search without registration access
- student lookup shows borrowed and overdue books when relevant
- login remains the default landing page
- build validation is passing after the latest changes

1. immediately a student requests a book the system logs them out correct this issue

2. the request is not recorded after it is sent and it does not appear in the librarian dashboard

3. imediately the server is started the librarian is logged in correct that make the login page be the default page

4. in the student login section the same information is displayed in the dashboard and borrow book section change this so that the students information is on the dashboard and the request form is on the request section

5. in the borrow book section the registration successful message, and student name and id appears remove them 

6. Allow a student to be able to search for a book by name and author only then they can request for the book if it is available

7. if a request is sent for a book that is not available send a message saying book is not available

8. do not automatically show available books until student searches for the book

9. remove any success message in the student dashboard page

10. allow a student to return a book then the librarian should approve returns

11. in the student section if he requests for a book show a message that says book request sent

12. when a page is refreshed do not reload the entire website and log out users

13. the book search for student section is down again

14. in the student section if a requests for a book show a message that says book request sent and if the page refreshes do not show any message

15.if a book is searched show all books with that name and author then if one is selected show only the selected book

16. after search show all available books if one book is selected highlight selected book and still show the rest of the books

17. the book is highlighted but if you leave the page, come back and search again the book that was previously selected is still highlighted corrested this so that no book is highlighted 

18. if a book is requested it still shows available when it is searched show requested instead

19. in the librarian dashboard on the nav bar there is a student borrow which is not active, remove it

20. in the librarian dashboard remove the active loan section

21. remove the book approval or error notification that appears on the librarian dashboard

22. if a request or a return is made show a little notification on the button in the navigation in numbers

23. in the librarian section after he approves request the button changes to return request and approve return do not allow this

24. if an undergraduate student requests for more than 3 books they shoul not be allowed to make another request

25. the librarian approve return and approve request button is not working

26. allow librarian to search for student by registration number

27. in the lirarian section do not display registerd students unless the student has been searched for

28. in the lirarian section do not display registerd books unless the student has been searched for

29. in the fuctional requirement the system can allow librarian issue library and borrow card to the students but the system does not adopt this feature

30. if the librarian registers a student show a message saying student registered successfully

31. after 5 seconds the message disappears

32. after logout and login back the success message still appears

33. do the same thing if a book has been added successfully

34. do not show an approval for return in librarian dashboard

35. the success message for added book does not appear

36. i want if a librarian searches for a student they should be able to see if the student has any books borrowed that he has not returned and any loan overdue, if not show the student has none of this

37. i can see that if a student has already requested and borrow a book another student cannot request for the same book, so if the book is not available show not available so that the student will know that the book has been borrowed by another student