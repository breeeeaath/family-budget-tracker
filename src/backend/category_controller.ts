// region MODULE_CONTRACT [DOMAIN(8): Budget, CategoryManagement; CONCEPT(9): API, Routing, ErrorHandling; TECH(9): Express, TypeScript]
// ## @modulecontract
// ## @purpose To define Express route handlers for category CRUD operations, acting as a thin HTTP adapter between the client and the CategoryService business layer.
// ## @scope HTTP request parsing, response formatting, error boundary for validation (400) and server errors (500).
// ## @input A CategoryService instance.
// ## @output An Express Router with GET/POST/PUT/DELETE /categories endpoints mounted under /api.
// ## @links [USES_API(9): Express/Router; CALLS_CLASS: CategoryService]
// ## @invariants
// ## - All routes catch errors and return 500 with `{ error: 'Internal server error' }`.
// ## - POST route returns 201 on success, 400 on validation error.
// ## - PUT route returns 200 on success, 400 on validation error.
// ## - DELETE route returns `{ success: true }` on success.
// ## @rationale
// ## Q: Why a factory function (createCategoryRouter) instead of a class?
// ## A: Express Router is already a natural grouping mechanism. A factory function is simpler and more idiomatic for Express route definitions.
// ## @changes
// ## LAST_CHANGE: [v2.0.0 – Initial creation of category router with CRUD endpoints and error handling]
// ## @modulemap
// ## FUNC 9[Creates Express Router for /categories endpoints] => createCategoryRouter
// ## @usecases
// ## - [createCategoryRouter]: server.ts -> createCategoryRouter(service) -> Mount at /api
// ## - [GET /categories]: Client -> getAll -> JSON array
// ## - [POST /categories]: Client -> create -> 201 + JSON object
// ## - [PUT /categories/:id]: Client -> update -> JSON object
// ## - [DELETE /categories/:id]: Client -> delete -> { success: true }
function _module_contract(): void {}
// endregion MODULE_CONTRACT
// GREP_SUMMARY: Express, router, API, controller, categories, GET, POST, PUT, DELETE, CRUD, error handling
// STRUCTURE: ▶ createCategoryRouter(service) → ○ ┌GET /categories┐: service.getAll() → res.json() → ◇ ┌POST /categories┐: try → service.create() → 201 || catch(400) → ◇ ┌PUT /categories/:id┐: try → service.update() → res.json() || catch(400) → ◇ ┌DELETE /categories/:id┐: try → service.delete() → {success} || catch → ⎋ Router

import { Router, Request, Response } from 'express';
import { CategoryService } from './category_service.js';

// region FUNC_createCategoryRouter [DOMAIN(8): Budget; CONCEPT(9): Routing; TECH(9): Express]
// ## @purpose To construct and return an Express Router instance pre-configured with all category CRUD endpoints, ready to be mounted by the server entry point.
// ## @uses Express.Router, CategoryService
// ## @io [CategoryService] -> [Router]
// ## @complexity 7
export function createCategoryRouter(categoryService: CategoryService): Router {
    const router = Router();
    console.log(`[IMP:6][createCategoryRouter][INIT] Category router created [FLOW]`);

    // region ROUTE_GET /categories [DOMAIN(8): Budget; CONCEPT(7): Read; TECH(7): Express]
    // ## @purpose To handle GET requests for the category list, delegating to CategoryService.getAll and returning a JSON array of all active categories.
    router.get('/', (req: Request, res: Response) => {
        console.log(`[IMP:5][createCategoryRouter][GET] Handling GET /categories [FLOW]`);
        try {
            const categories = categoryService.getAll();
            console.log(`[IMP:7][createCategoryRouter][GET] Returning ${categories.length} categories [IO]`);
            res.json(categories);
        } catch (error) {
            console.error(`[IMP:10][createCategoryRouter][GET] CRITICAL: Error in GET /categories [FATAL]`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // endregion ROUTE_GET

    // region ROUTE_POST /categories [DOMAIN(8): Budget; CONCEPT(8): Create; TECH(8): Express]
    // ## @purpose To parse the request body, delegate to CategoryService.create, and return the newly created category with HTTP 201 status. Validation errors from the service are caught and re-mapped to 400.
    router.post('/', (req: Request, res: Response) => {
        const { name, icon } = req.body;
        console.log(`[IMP:5][createCategoryRouter][POST] Handling POST /categories: name='${name}', icon='${icon}' [FLOW]`);
        try {
            const newCategory = categoryService.create(name, icon);
            console.log(`[IMP:9][createCategoryRouter][POST] Created category id=${newCategory.id}, returning 201 [BUSINESS]`);
            res.status(201).json(newCategory);
        } catch (error: any) {
            if (error instanceof Error && error.message.startsWith('Validation failed')) {
                console.log(`[IMP:9][createCategoryRouter][POST] Validation error: ${error.message} [BUSINESS]`);
                res.status(400).json({ error: error.message });
            } else {
                console.error(`[IMP:10][createCategoryRouter][POST] CRITICAL: Error in POST /categories [FATAL]`, error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
    // endregion ROUTE_POST

    // region ROUTE_PUT /categories/:id [DOMAIN(8): Budget; CONCEPT(8): Update; TECH(7): Express]
    // ## @purpose To handle PUT requests for renaming a category by id, delegating to CategoryService.update and returning the updated record.
    router.put('/:id', (req: Request, res: Response) => {
        const id = parseInt(req.params.id, 10);
        const { name } = req.body;
        console.log(`[IMP:5][createCategoryRouter][PUT] Handling PUT /categories/${id}: name='${name}' [FLOW]`);
        try {
            const updatedCategory = categoryService.update(id, name);
            console.log(`[IMP:7][createCategoryRouter][PUT] Updated category id=${id} [IO]`);
            res.json(updatedCategory);
        } catch (error: any) {
            if (error instanceof Error && (error.message.startsWith('Validation failed') || error.message.startsWith('Category id='))) {
                console.log(`[IMP:9][createCategoryRouter][PUT] Validation/not-found error: ${error.message} [BUSINESS]`);
                res.status(400).json({ error: error.message });
            } else {
                console.error(`[IMP:10][createCategoryRouter][PUT] CRITICAL: Error in PUT /categories/${id} [FATAL]`, error);
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
    // endregion ROUTE_PUT

    // region ROUTE_DELETE /categories/:id [DOMAIN(8): Budget; CONCEPT(8): Delete; TECH(7): Express]
    // ## @purpose To handle DELETE requests for a specific category by id, delegating to CategoryService.delete and returning a success confirmation.
    router.delete('/:id', (req: Request, res: Response) => {
        const id = parseInt(req.params.id, 10);
        console.log(`[IMP:5][createCategoryRouter][DELETE] Handling DELETE /categories/${id} [FLOW]`);
        try {
            const deleted = categoryService.delete(id);
            console.log(`[IMP:7][createCategoryRouter][DELETE] Deleted category id=${id}, deleted=${deleted} [IO]`);
            res.json({ success: true });
        } catch (error) {
            console.error(`[IMP:10][createCategoryRouter][DELETE] CRITICAL: Error in DELETE /categories/${req.params.id} [FATAL]`, error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // endregion ROUTE_DELETE

    console.log(`[IMP:6][createCategoryRouter][READY] Routes mounted: GET /categories, POST /categories, PUT /categories/:id, DELETE /categories/:id [FLOW]`);
    return router;
}
// endregion FUNC_createCategoryRouter
